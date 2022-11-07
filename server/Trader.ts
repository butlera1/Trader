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
import isoWeek from 'dayjs/plugin/isoWeek';
import {Trades} from './collections/trades';
import ITradeSettings from '../imports/Interfaces/ITradeSettings';
import {TradeSettings} from './collections/TradeSettings';
import {UserSettings} from './collections/UserSettings';
// @ts-ignore
import {Random} from 'meteor/random';
import _ from 'lodash';
import {LogData, LogType} from "./collections/Logs";

dayjs.extend(duration);
dayjs.extend(isoWeek);
const isoWeekdayNames = ['skip', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
    if (result?.currentPrice) {
      currentPrice = result?.currentPrice || Number.NaN;
      quoteTime = result?.quoteTime;
      return currentPrice;
    }
    count++;
  }
  const message = 'GetOptionsPriceLoop: Failed to get a valid currentPrice.';
  const ex = new Error(message);
  LogData(tradeSettings, message, ex);
  return Number.NaN;
}

function MonitorTradeToCloseItOut(tradeSettings: ITradeSettings) {
  let timerHandle = null;
  const {
    userId,
    isMocked,
    percentGain,
    percentLoss,
    accountNumber,
    exitHour,
    exitMinute,
    openingPrice,
    closingOrder,
  } = tradeSettings;
  const gainLimit = openingPrice - openingPrice * percentGain;
  const lossLimit = openingPrice + openingPrice * percentLoss;
  const localEarlyExitTime = GetNewYorkTimeAt(exitHour, exitMinute);
  timerHandle = Meteor.setInterval(async () => {
    try {
      // Read the trades value.
      const currentPrice = await GetOptionsPriceLoop(tradeSettings);
      if (currentPrice === Number.NaN) {
        return; // Try again on next interval timeout.
      }
      const localNow = dayjs();
      const isEndOfDay = localEarlyExitTime.isBefore(localNow);
      const isGainLimit = (Math.abs(currentPrice) <= gainLimit);
      const isLossLimit = (currentPrice >= lossLimit);
      const possibleGainLoss = currentPrice + openingPrice; // Adding: one will be credit/sold and the other debit/bought.
      const message = `MonitorTradeToCloseItOut: Entry: $${openingPrice.toFixed(2)}, Current: $${currentPrice.toFixed(2)}, Possible G/L $${possibleGainLoss.toFixed(2)} ${quoteTime?.format('hh:mm:ss a')} for record ${tradeSettings.openingOrderId}`;
      LogData(tradeSettings, message);
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
        tradeSettings.gainLoss = openingPrice + tradeSettings.closingPrice; // Adding: one credit/sold, other debit/bought.
        const message = `Trade closing (${whyClosed}): Entry: $${openingPrice.toFixed(2)}, Exit: $${tradeSettings.closingPrice.toFixed(2)}, G/L $${tradeSettings.gainLoss.toFixed(2)} ${tradeSettings.whenClosed} (NY) for record ${tradeSettings.openingOrderId}`;
        LogData(tradeSettings, message);
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
      const message = `Trader has an exception in MonitorTradeToCloseItOut.`;
      LogData(tradeSettings, message, ex);
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
  order.orderActivityCollection?.forEach((item) => {
    item.executionLegs.forEach((leg) => {
      if (isBuyMap[leg.legId]) {
        price = price - leg.price;
      } else {
        price = price + leg.price;
      }
    });
  });
  // For trigger orders, we recurse into the triggered childOrders
  if (order.childOrderStrategies) {
    order.childOrderStrategies.forEach((childOrder) => {
      price = price + calculateFillPrice(childOrder);
    })
  }
  return price;
}

function calculateIfOrderIsFilled(order) {
  let isFilled = (order.status === 'FILLED');
  order.childOrderStrategies?.forEach((childOrder) => isFilled = isFilled && calculateIfOrderIsFilled(childOrder));
  return isFilled;
}

async function WaitForOrderCompleted(userId, accountNumber, orderId) {
  return new Promise<number>(async (resolve, reject) => {
    let timerHandle = null;
    let counter = 0;
    timerHandle = Meteor.setInterval(async () => {
      const order = await GetOrders(userId, accountNumber, orderId);
      const isOrderFilled = calculateIfOrderIsFilled(order);
      if (order.status === 'FILLED') {
        Meteor.clearInterval(timerHandle);
        resolve(calculateFillPrice(order));
      }
      counter++;
      if (counter === 20) {
        Meteor.clearInterval(timerHandle);
        reject(`Order ${orderId} has failed to fill within the desired time.`);
      }
    }, 6000);
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
  tradeSettings._id = _id; // Switch _id for storing into Trades collection.
  // @ts-ignore
  tradeSettings.whenOpened = Date.now().toLocaleString('en-US', {timeZone: 'America/New_York'});
  // Record this opening order data.
  Trades.insert({...tradeSettings});
  if (_.isNumber(tradeSettings.openingPrice)) {
    MonitorTradeToCloseItOut(tradeSettings);
  }
  return;
}

async function ExecuteTrade(tradeSettings: ITradeSettings, forceTheTrade = false) {
  const now = dayjs();
  const nowText = dayjs().format('hh:mma MMM DD, YYYY');
  const currentDayOfTheWeek = isoWeekdayNames[now.isoWeekday()];
  const justBeforeClose = GetNewYorkTimeAt(15, 55);
  const notTooLateToTrade = now.isBefore(justBeforeClose);
  const tradePatternIncludesThisDayOfTheWeek = tradeSettings.days?.includes(currentDayOfTheWeek);
  const hasLegsInTrade = tradeSettings.legs.length > 0;
  const performTheTrade = (tradeSettings.isActive && notTooLateToTrade && tradePatternIncludesThisDayOfTheWeek && hasLegsInTrade);
  if (forceTheTrade || performTheTrade) {
    try {
      // Make sure we have latest userSettings for this new trade about to happen.
      const userSettings = UserSettings.findOne({_id: tradeSettings.userId});
      tradeSettings.accountNumber = userSettings.accountNumber;
      tradeSettings.phone = userSettings.phone;
      tradeSettings.emailAddress = userSettings.email;
      console.log(`Trading for ${tradeSettings.userName} @ ${nowText} with ${JSON.stringify(tradeSettings)}`);
      // Place the opening trade and monitor it to later close it out.
      const chains = await GetATMOptionChains(tradeSettings.symbol, tradeSettings.userId);
      // The trade orders are assigned to the tradeSettings object.
      const ordersReady = CreateMarketOrdersToOpenAndToClose(chains, tradeSettings);
      if (ordersReady) {
        await PlaceOpeningOrderAndMonitorToClose(tradeSettings);
      }
    } catch (ex) {
      const when = dayjs();
      const msg = `ExecuteTrade failed with user ${tradeSettings.userName} at ${when.format('MMM DD, YYYY hh:mm:ssa')}. Exception: ${ex}`;
      LogData(tradeSettings, msg, ex);
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
      Meteor.setTimeout(() => ExecuteTrade(tradeSettings), delayInMilliseconds);
    });
  }));
}

export {
  WaitForOrderCompleted,
  MonitorTradeToCloseItOut,
  GetNewYorkTimeAt,
  PerformTradeForAllUsers,
  ExecuteTrade
};