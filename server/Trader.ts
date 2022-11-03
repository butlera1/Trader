// @ts-ignore
import {Meteor} from 'meteor/meteor';
// @ts-ignore
import {Email} from 'meteor/email';
import {
  CreateMarketOrdersToOpenAndToClose,
  GetATMOptionChains,
  GetOrders,
  GetPriceForOptions,
  IsOptionMarketOpenToday,
  PlaceOrder
} from './TDAApi/TDAApi.js';
import {Users} from './collections/users';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import {Trades} from './collections/trades';
import ITradeSettings from '../imports/Interfaces/ITradeSettings';
import {TradeSettings} from './collections/TradeSettings';
import UserSettings from './collections/UserSettings';
// @ts-ignore
import {Random} from 'meteor/random';

dayjs.extend(duration);
const tenSeconds = 10000;

function clearInterval(timerHandle) {
  if (timerHandle) {
    Meteor.clearInterval(timerHandle);
  }
  return null;
}

/**
 * Given an hour number 0-23 and minutes, this returns a dayjs object that is that time in New York times zone.
 * This assumes that any time zone differences from where the code is running and New York is in hours and single
 * digits at that.
 *
 * @param hour
 * @param minute
 * @returns {dayjs.Dayjs}
 */
function GetNewYorkTimeAt(hour, minute) {
  const currentLocalTime = new Date();
  const currentNYTime = new Date(currentLocalTime.toLocaleString('en-US', {timeZone: 'America/New_York'}));
  let timeZoneDifference = currentNYTime.getHours() - currentLocalTime.getHours();
  if (timeZoneDifference < 0) {
    // This happens when
    timeZoneDifference = 24 + timeZoneDifference;
  }
  const currentTimeZoneOffset = currentLocalTime.getTimezoneOffset() / 60;
  const nyTimeZoneOffsetFromCurrentTimeZone = currentTimeZoneOffset - timeZoneDifference;
  let amPm = 'AM';
  if (hour > 11) {
    amPm = 'PM';
    if (hour > 12) {
      hour = hour - 12;
    }
  }
  const newYorkTimeAtGivenhourAndMinuteText = `${dayjs().format('YYYY-MM-DD')}, ${hour}:${minute}:00 ${amPm} GMT-0${nyTimeZoneOffsetFromCurrentTimeZone}00`;
  return dayjs(newYorkTimeAtGivenhourAndMinuteText);
}

async function GetOptionsPriceLoop(tradeSettings: ITradeSettings) {
  let result = null;
  let currentPrice = Number.NaN;
  let quoteTime = null;
  let count = 0;
  while (count < 3) {
    try {
      result = await GetPriceForOptions(tradeSettings);
    } catch (ex) {
      console.error(`GetOptionsPriceLoop: Failed GetPriceForOptions.`, ex);
    }
    currentPrice = result?.currentPrice || Number.NaN;
    quoteTime = result?.quoteTime;
    if (currentPrice !== Number.NaN) {
      return {currentPrice, quoteTime};
    }
    count++;
  }
  return {currentPrice, quoteTime};
}

function sendOutInfo(text: string, subject: string, to: string, phone: string) {
  // TODO (AWB) Need a mail service set into MAIL_URL env var for the following to work.
  const emailOptions = {
    to,
    from: 'spockab@gmail.com',
    subject,
    text,
  };
  Email.send(emailOptions);
  // TODO (AWB) Send SMS to mobile
  // Use phone here to send SMS messages.
  console.log(`Could be sms'ing to ${phone}`);
}

function MonitorTradeToCloseItOut(tradeSettings: ITradeSettings) {
  let timerHandle = null;
  const {
    userId,
    isMocked,
    percentGain,
    percentLoss,
    accountNumber,
    emailAddress,
    phone,
    exitHour,
    exitMinute,
    openingPrice,
    closingOrder,
  } = tradeSettings;
  const gainLimit = openingPrice - openingPrice * percentGain;
  const lossLimit = openingPrice + openingPrice * percentLoss;
  const earlyExitTime = GetNewYorkTimeAt(exitHour, exitMinute);
  timerHandle = Meteor.setInterval(async () => {
    try {
      // Read the trades value.
      const {currentPrice, quoteTime} = await GetOptionsPriceLoop(tradeSettings);
      if (currentPrice === Number.NaN) {
        console.error('MonitorTradeToCloseItOut: Failed to get a valid currentPrice.');
        const subject = `TRADER Failed to get current price.`;
        const text = `Trader has failed to get the current price on options.\n\n--Trader System`;
        sendOutInfo(text, subject, emailAddress, phone);
        return;
      }
      const isEndOfDay = earlyExitTime.isBefore(quoteTime);
      const isGainLimit = (currentPrice <= gainLimit);
      const isLossLimit = (currentPrice >= lossLimit);
      const possibleGainLoss = currentPrice - openingPrice;
      console.log(`Monitoring: sold at $${openingPrice.toFixed(2)}, current price $${currentPrice.toFixed(2)}, G/L $${possibleGainLoss.toFixed(2)} ${quoteTime?.format('hh:mm:ss a')} (NY) for record ${tradeSettings.openingOrderId}`);
      if (isGainLimit || isLossLimit || isEndOfDay) {
        timerHandle = clearInterval(timerHandle);
        if (isMocked) {
          tradeSettings.closingOrderId = Random.id() + '_MOCKED';
          tradeSettings.closingPrice = currentPrice;
        } else {
          tradeSettings.closingOrderId = await PlaceOrder(userId, accountNumber, closingOrder);
          tradeSettings.closingPrice = await WaitForOrderCompleted(userId, accountNumber, tradeSettings.closingOrderId);
        }
        let whyClosed = 'gainLimit';
        if (isLossLimit) {
          whyClosed = 'lossLimit';
        }
        if (isEndOfDay) {
          whyClosed = 'earlyExit';
        }
        tradeSettings.whyClosed = whyClosed;
        // @ts-ignore
        tradeSettings.whenClosed = Date.now().toLocaleString('en-US', {timeZone: 'America/New_York'});
        // OpeningPrice will be positive since it was sold and closePrice will be negative buyback.
        tradeSettings.gainLoss = openingPrice + tradeSettings.closingPrice;
        Trades.update(tradeSettings._id, {
          $set: {
            closingOrderId: tradeSettings.closingOrderId,
            closingPrice: tradeSettings.closingPrice,
            whyClosed: tradeSettings.whyClosed,
            whenClosed: tradeSettings.whenClosed,
            gainLoss: tradeSettings.gainLoss,
          }
        });
      }
    } catch (ex) {
      timerHandle = clearInterval(timerHandle);
      // We have an emergency if this happens, so send communications.
      const subject = `TRADER EXCEPTION: ${ex.toString()}`;
      const text = `Trader has an exception in MonitorTradeToCloseItOut.\n\n--Trader System`;
      sendOutInfo(text, subject, emailAddress, phone);
    }
  }, tenSeconds);
}

function calculateFillPrice(order) {
  const isBuyMap = {};
  let price = 0;
  // Define isBuyMap, so we know which legId is buy or a sell.
  order.orderLegCollection.forEach((item) => {
    isBuyMap[item.legId] = item.instruction.startsWith('BUY');
  });
  // For all the executed legs, calculate the final price.
  order.orderActivityCollection.forEach((item) => {
    item.executionLegs.forEach((leg) => {
      if (isBuyMap[leg.legId]) {
        price = price - leg.price;
      } else {
        price = price + leg.price;
      }
    });
  });
  console.log(`FILLED ORDER PRICE: ${price}`);
  return price;
}

async function WaitForOrderCompleted(userId, accountNumber, orderId) {
  return new Promise<number>(async (resolve, reject) => {
    let timerHandle = null;
    let counter = 0;
    timerHandle = Meteor.setInterval(async () => {
      const order = await GetOrders(userId, accountNumber, orderId);
      if (order.status === 'FILLED') {
        Meteor.clearInterval(timerHandle);
        resolve(calculateFillPrice(order));
      }
      counter++;
      if (counter === 10) {
        Meteor.clearInterval(timerHandle);
        reject(`Order ${orderId} has failed to fill within the desired time.`);
      }
    }, 2000);
  });
}

function catchError(reason) {
  const when = dayjs();
  const msg = `PerformTradeForAllUsers failed at ${when.format('dd-mm-mmmm HH:MM:SS')}. Exception: ${reason}`;
  console.error(msg);
}

async function PlaceOpeningOrderAndMonitorToClose(tradeSettings: ITradeSettings) {
  let _id = Random.id();
  if (tradeSettings.isMocked) {
    _id = _id + '_MOCKED';
    tradeSettings.openingOrderId = _id;
    // tradeSettings.openingPrice has already been estimated when orders were created.
  } else {
    tradeSettings.openingOrderId = await PlaceOrder(tradeSettings.userId, tradeSettings.accountNumber, tradeSettings.openingOrder);
    tradeSettings.openingPrice = await WaitForOrderCompleted(tradeSettings.userId, tradeSettings.accountNumber, tradeSettings.openingOrderId);
  }
  // @ts-ignore
  tradeSettings.whenOpened = Date.now().toLocaleString('en-US', {timeZone: 'America/New_York'});
  // Record this opening order data.
  Trades.insert({_id, ...tradeSettings});
  if (tradeSettings.openingPrice) {
    MonitorTradeToCloseItOut(tradeSettings);
  }
  return;
}

async function PerformTradeForUser(tradeSettings: ITradeSettings) {
  const now = dayjs();
  const nowText = dayjs().format('hh:mma MMM DD, YYYY');
  const justBeforeClose = GetNewYorkTimeAt(15, 55);
  const notTooLateToTrade = now.isBefore(justBeforeClose);
  if (tradeSettings.isActive && notTooLateToTrade) {
    try {
      console.log(`Trading for ${tradeSettings.userName} @ ${nowText} with ${JSON.stringify(tradeSettings)}`);
      // Place the opening trade and monitor it to later close it out.
      const chains = await GetATMOptionChains(tradeSettings.symbol, tradeSettings.userId);
      // The trade orders are assigned to the tradeSettings object.
      CreateMarketOrdersToOpenAndToClose(chains, tradeSettings);
      await PlaceOpeningOrderAndMonitorToClose(tradeSettings);
    } catch (ex) {
      const when = dayjs();
      const msg = `PerformTradeForAllUsers failed with user ${tradeSettings.userName} at ${when.format('MMM DD, YYYY hh:mm:ssa')}. Exception: ${ex}`;
      console.error(msg);
    }
  } else {
    console.log(`Trading is off for ${tradeSettings.userId} or too late in the day @ ${nowText} with ${JSON.stringify(tradeSettings)}`);
  }
}

async function PerformTradeForAllUsers() {
  const userArch = Users.findOne({username: 'Arch'});
  const isMarketOpened = await IsOptionMarketOpenToday(userArch._id).catch(catchError);
  if (!isMarketOpened) {
    console.log('Market is closed today');
    return;
  }
  const users = Users.find().fetch();
  users.forEach((async (user) => {
    const accountNumber = UserSettings.findOne({userId: user._id}).accountNumber;
    const tradeSettingsSet = TradeSettings.find({userId: user._id}).fetch();
    tradeSettingsSet.forEach((tradeSettings: ITradeSettings) => {
      const desiredTradeTime = dayjs(GetNewYorkTimeAt(tradeSettings.entryHour, tradeSettings.entryMinute));
      let delayInMilliseconds = dayjs.duration(desiredTradeTime.diff(dayjs())).asMilliseconds();
      if (delayInMilliseconds < 0) {
        delayInMilliseconds = 0;
      }
      console.log(`Scheduling opening trade for ${user.username} at ${desiredTradeTime.format('hh:mm a')}.`);
      tradeSettings.accountNumber = accountNumber;
      tradeSettings.userName = user.username;
      Meteor.setTimeout(() => PerformTradeForUser(tradeSettings), delayInMilliseconds);
    });
  }));
}

export {
  WaitForOrderCompleted,
  MonitorTradeToCloseItOut,
  GetNewYorkTimeAt,
  PerformTradeForAllUsers,
  PerformTradeForUser
};