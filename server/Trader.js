import {Email} from 'meteor/email';
import {
  GetATMOptionChains,
  GetIronCondorTradeOrders,
  GetOrders,
  GetPriceForOptions,
  IsOptionMarketOpenToday,
  PlaceOrder
} from './TDAApi/TDAApi';
import {Users} from './collections/users';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import {Trades} from './collections/trades';
import {DefaultTradeSettings} from '../imports/Interfaces/ITradeSettings';

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
  const timeZoneDifference = currentNYTime.getHours() - currentLocalTime.getHours();
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

async function CloseICViaMarketOrders(userId, accountNumber, closingLegOrders) {
  // Perform buy orders first then the sells
  const buyIds = [];
  for (let i = 0; i < closingLegOrders.buys.length; i++) {
    const order = closingLegOrders.buys[i];
    const orderId = await PlaceOrder(userId, accountNumber, order);
    buyIds.push(orderId);
  }
  console.log(`BUYING BACK THE SOLD Options:`);
  const buyPrices = [];
  for (let i = 0; i < buyIds.length; i++) {
    const orderId = buyIds[i];
    const price = await WaitForOrderCompleted(userId, accountNumber, orderId);
    console.log(`BUY PRICE: ${price}`);
    buyPrices.push(price);
  }

  // All the buy legs are completed, so execute the sell legs.
  const sellIds = [];
  for (let i = 0; i < closingLegOrders.sells.length; i++) {
    const order = closingLegOrders.sells[i];
    const orderId = await PlaceOrder(userId, accountNumber, order);
    sellIds.push(orderId);
  }
  const sellPrices = [];
  for (let i = 0; i < sellIds.length; i++) {
    const orderId = sellIds[i];
    const price = await WaitForOrderCompleted(userId, accountNumber, orderId);
    console.log(`SELL PRICE: ${price}`);
    sellPrices.push(price);
  }
  // Calculate the totals for the closing effort.
  let price = 0;
  // The prices come back negative when buying so simply add them all up.
  sellPrices.forEach((sellPrice) => price += sellPrice);
  buyPrices.forEach((buyPrice) => price += buyPrice);
  console.log(`PRICE: ${price}`);
  return price;
}

async function GetOptionsPriceLoop(userId, options){
  let result = null;
  let currentPrice = Number.NaN;
  let quoteTime = null;
  let count = 0;
  while (count < 3) {
    try {
      result = await GetPriceForOptions(userId, options);
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

function sendOutInfo(text, subject, to){
  // TODO (AWB) Need a mail service set into MAIL_URL env var for the following to work.
  const emailOptions = {
    to,
    from: 'spockab@gmail.com',
    subject,
    text,
  };
  Email.send(emailOptions);
  // TODO (AWB) Send SMS to mobile
}

function MonitorTradeToCloseItOut(userId, tradeSettings, openingPrice, closingLegOrders, options, tradeRecordId) {
  let timerHandle = null;
  const {
    percentGain,
    percentLoss,
    accountNumber,
    emailAddress,
    phone,
    closeHour,
    closeMinute,
  } = tradeSettings;
  const gainLimit = openingPrice - openingPrice * percentGain;
  const lossLimit = openingPrice + openingPrice * percentLoss;
  const earlyExitTime = GetNewYorkTimeAt(closeHour, closeMinute);
  timerHandle = Meteor.setInterval(async () => {
    try {
      // Read the trades value.
      const {currentPrice, quoteTime} = await GetOptionsPriceLoop(userId, options);
      if (currentPrice === Number.NaN) {
        console.error('MonitorTradeToCloseItOut: Failed to get a valid currentPrice.');
        const subject = `TRADER Failed to get current price.`;
        const text = `Trader has failed to get the current price on options.\n\n--Trader System`;
        sendOutInfo(text, subject, 'spockab@gmail.com');
        return;
      }
      const isEndOfDay = earlyExitTime.isBefore(quoteTime);
      const isGainLimit = (currentPrice <= gainLimit);
      const isLossLimit = (currentPrice >= lossLimit);
      const possibleGainLoss = currentPrice - openingPrice;
      console.log(`Monitoring: sold at $${openingPrice.toFixed(2)}, current price $${currentPrice.toFixed(2)}, G/L $${possibleGainLoss.toFixed(2)} ${quoteTime?.format('hh:mm:ss a')} (NY) for record ${tradeRecordId}`);
      if (isGainLimit || isLossLimit || isEndOfDay) {
        timerHandle = clearInterval(timerHandle);
        const closePrice = await CloseICViaMarketOrders(userId, accountNumber, closingLegOrders);
        let whyClosed = 'gainLimit';
        if (isLossLimit) {
          whyClosed = 'lossLimit';
        }
        if (isEndOfDay) {
          whyClosed = 'earlyExit';
        }
        const whenClosed = new Date();
        // OpeningPrice will be positive since it was sold and closePrice will be negative buyback.
        const gainLoss = openingPrice + closePrice;
        Trades.update({_id: tradeRecordId}, {$set: {closePrice, gainLoss, whenClosed, whyClosed}});
      }
    } catch (ex) {
      timerHandle = clearInterval(timerHandle);
      // We have an emergency if this happens send communications.
      const subject = `TRADER EXCEPTION: ${ex.toString()}`;
      const text = `Trader has an exception in MonitorTradeToCloseItOut.\n\n--Trader System`;
      sendOutInfo(text, subject, 'spockab@gmail.com');
    }
  }, tenSeconds);
}

function calculateFillPrice(order) {
  const isBuyMap = {};
  let price = 0;
  // Define isBuyMap, so we know which legId is buy or a sell.
  order.orderLegCollection.forEach((item) => {
    isBuyMap[item.legId] = item.instruction.startsWith('BUY') ? true : false;
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
  return new Promise(async (resolve, reject) => {
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

async function PlaceOpeningOrderAndMonitorToClose(userId, tradeSettings, openingOrder, closingLegOrders, options) {
  const openingOrderId = await PlaceOrder(userId, tradeSettings.accountNumber, openingOrder);
  const openingPrice = await WaitForOrderCompleted(userId, tradeSettings.accountNumber, openingOrderId);
  // Record this opening order data.
  Trades.insert({
    _id: openingOrderId,
    when: new Date(),
    symbol: tradeSettings.symbol,
    quantity: tradeSettings.quantity,
    desiredDelta: tradeSettings.desiredDelta,
    percentGain: tradeSettings.percentGain,
    percentLoss: tradeSettings.percentLoss,
    earlyExitTime: tradeSettings.earlyExitTime,
    openingPrice,
    options,
  });
  if (openingPrice) {
    MonitorTradeToCloseItOut(userId, tradeSettings, openingPrice, closingLegOrders, options, openingOrderId);
  }
  return {openingOrderId, openingPrice};
}

async function PerformTradeForUser(user) {
  const tradeSettings = {...DefaultTradeSettings, ...user.services?.tradeSettings};
  const now = dayjs();
  const nowText = dayjs().format('hh:mma MMM DD, YYYY');
  const justBeforeClose = GetNewYorkTimeAt(15, 55);
  const notTooLateToTrade = now.isBefore(justBeforeClose);
  if (tradeSettings.isTrading && notTooLateToTrade) {
    try {
      console.log(`Trading for ${user.username} @ ${nowText} with ${JSON.stringify(tradeSettings)}`);
      // Place the opening trade and monitor it to later close it out.
      const chains = await GetATMOptionChains(tradeSettings.symbol, user._id);
      const {openingOrder, closingLegOrders, options} = GetIronCondorTradeOrders(chains, tradeSettings);
      const {
        openingOrderId,
        openingPrice
      } = await PlaceOpeningOrderAndMonitorToClose(user._id, tradeSettings, openingOrder, closingLegOrders, options);
    } catch (ex) {
      const when = dayjs();
      const msg = `PerformTradeForAllUsers failed with user ${user.username} at ${when.format('MMM DD, YYYY hh:mm:ssa')}. Exception: ${ex}`;
      console.error(msg);
    }
  } else {
    console.log(`Trading is off for ${user.username} or too late in the day @ ${nowText} with ${JSON.stringify(tradeSettings)}`);
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
    const tradeSettings = {...user.services?.tradeSettings, ...DefaultTradeSettings};
    const desiredTradeTime = dayjs(GetNewYorkTimeAt(tradeSettings.openHour, tradeSettings.openMinute));
    let delayInMilliseconds = dayjs.duration(desiredTradeTime.diff(dayjs())).asMilliseconds();
    if (delayInMilliseconds < 0) {
      delayInMilliseconds = 0;
    }
    console.log(`Scheduling opening trade for ${user.username} in ${delayInMilliseconds / 60000} minutes.`);
    Meteor.setTimeout(() => PerformTradeForUser(user), delayInMilliseconds);
  }));
}

export {
  WaitForOrderCompleted,
  MonitorTradeToCloseItOut,
  GetNewYorkTimeAt,
  PerformTradeForAllUsers,
  PerformTradeForUser
};