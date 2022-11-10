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
import {Trades} from './collections/Trades';
import ITradeSettings from '../imports/Interfaces/ITradeSettings';
import {TradeSettings} from './collections/TradeSettings';
import {UserSettings} from './collections/UserSettings';
// @ts-ignore
import {Random} from 'meteor/random';
import _ from 'lodash';
import {LogData} from "./collections/Logs";
import SendOutInfo from './SendOutInfo';

dayjs.extend(duration);
dayjs.extend(isoWeek);
const isoWeekdayNames = ['skip', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const fiveSeconds = 5000;

function clearInterval(timerHandle) {
  if (timerHandle) {
    Meteor.clearInterval(timerHandle);
  }
  return null;
}

function GetNewYorkTimeNowAsText() {
  const currentLocalTime = new Date();
  const NYTimeText = currentLocalTime.toLocaleString('en-US', {timeZone: 'America/New_York'});
  return NYTimeText;
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
  const newYorkTimeAtGivenHourAndMinuteText = `${dayjs().format('YYYY-MM-DD')}, ${hour}:${minute}:00 ${amPm} GMT-0${nyTimeZoneOffsetFromCurrentTimeZone}00`;
  return dayjs(newYorkTimeAtGivenHourAndMinuteText);
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

async function CloseTrade(tradeSettings: ITradeSettings, whyClosed: string, currentPrice: number) {
  tradeSettings.whyClosed = whyClosed;
  const {isMocked, userId, accountNumber, closingOrder, openingPrice} = tradeSettings;
  if (isMocked) {
    tradeSettings.closingOrderId = Random.id() + '_MOCKED';
    tradeSettings.closingPrice = currentPrice;
  } else {
    tradeSettings.closingOrderId = await PlaceOrder(userId, accountNumber, closingOrder).catch(error => {
      LogData(tradeSettings, error.toString(), error);
      return null;
    });
    if (tradeSettings.closingOrderId) {
      tradeSettings.closingPrice = await WaitForOrderCompleted(userId, accountNumber, tradeSettings.closingOrderId).catch(error => {
        LogData(tradeSettings, error.toString(), error);
        return 0;
      });
    }
  }
  tradeSettings.whenClosed = GetNewYorkTimeNowAsText();
  // OpeningPrice will be positive since it was sold and closePrice will be negative buyback.
  tradeSettings.gainLoss = openingPrice + tradeSettings.closingPrice; // Adding: one credit/sold, other debit/bought.
  const message = `Trade closed (${whyClosed}): Entry: $${openingPrice.toFixed(2)}, ` +
    `Exit: $${tradeSettings.closingPrice?.toFixed(2)}, ` +
    `G/L $${tradeSettings.gainLoss?.toFixed(2)} ID: ${tradeSettings._id}`;
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
  const subject = `Closed trade (${tradeSettings.whyClosed}) gain: $${tradeSettings.gainLoss.toFixed(2)} at ${tradeSettings.whenClosed} NY`;
  SendOutInfo(subject, subject, tradeSettings.emailAddress, tradeSettings.phone);
}

function EmergencyCloseAllTrades() {
  if (!Meteor.userId()) {
    throw new Meteor.Error(`EmergencyCloseAllTrades: Must have valid user.`);
  }
  let result = '';
  try {
    // Find all live trades for this user.
    const liveTrades = Trades.find({userId: Meteor.userId(), whyClosed: {$exists: false}}).fetch();
    result = `Found ${liveTrades.label} trades.`;
    liveTrades.forEach(async (tradeSettings) => {
      // Get the last recorded price for this trade and use it for the exit price if in mocked mode.
      // Note the closingPrice defaults to the NEGATIVE of the openingPrice.
      let exitPrice = -tradeSettings.openingPrice;
      if (tradeSettings.monitoredPrices?.length > 0) {
        exitPrice = tradeSettings.monitoredPrices[tradeSettings.monitoredPrices.length - 1].price;
      }
      await CloseTrade(tradeSettings, 'emergencyExit', exitPrice).catch(error => {
        LogData(tradeSettings, error.toString(), error);
      });
    });
    return `${result} Closed them all down.`;
  } catch (ex) {
    throw new Meteor.Error(`EmergencyCloseAllTrades: ${result}. Closing them failed with ${ex}`);
  }
}

function MonitorTradeToCloseItOut(tradeSettings: ITradeSettings) {
  let timerHandle = null;
  const {
    _id,
    exitHour,
    exitMinute,
    gainLimit,
    lossLimit,
    openingPrice,
  } = tradeSettings;
  const localEarlyExitTime = GetNewYorkTimeAt(exitHour, exitMinute);
  timerHandle = Meteor.setInterval(async () => {
    try {
      const activeTrade = Trades.findOne(_id);
      if (activeTrade?.whyClosed) {
        // trade has been completed already (probably emergency exit) so stop the interval timer and exit.
        LogData(tradeSettings, `MonitorTradeToCloseItOut: Trade ${tradeSettings._id} closed async, so stopping monitoring.`);
        if (timerHandle) {
          Meteor.clearInterval(timerHandle);
        }
        return;
      }
      // Get the current price for the trade.
      const currentPrice = await GetOptionsPriceLoop(tradeSettings);
      if (currentPrice === Number.NaN) {
        return; // Try again on next interval timeout.
      }
      let possibleGain = currentPrice + openingPrice;
      if (openingPrice < 0) possibleGain = -possibleGain;
      // Record price value for historical reference and charting.
      const whenNY = GetNewYorkTimeNowAsText();
      Trades.update(tradeSettings._id, {$addToSet: {monitoredPrices: {price: currentPrice, whenNY, gain: possibleGain}}});
      const localNow = dayjs();
      const isEndOfDay = localEarlyExitTime.isBefore(localNow);
      const absCurrentPrice = Math.abs(currentPrice);
      let isGainLimit = (absCurrentPrice <= gainLimit);
      let isLossLimit = (absCurrentPrice >= lossLimit);
      if (openingPrice > 0) { // Means we are long the trade (we want values to go up).
        isGainLimit = (absCurrentPrice >= gainLimit);
        isLossLimit = (absCurrentPrice <= lossLimit);
      }
      if (isGainLimit || isLossLimit || isEndOfDay) {
        timerHandle = clearInterval(timerHandle);
        let whyClosed = 'gainLimit';
        if (isLossLimit) {
          whyClosed = 'lossLimit';
        }
        if (isEndOfDay) {
          whyClosed = 'earlyExit';
        }
        await CloseTrade(tradeSettings, whyClosed, currentPrice);
      } else {
        const message = `MonitorTradeToCloseItOut: Entry: $${openingPrice.toFixed(2)}, ` +
          `Current: $${currentPrice.toFixed(2)}, ` +
          `GainLimit: $${gainLimit.toFixed(2)}, LossLimit: $${lossLimit.toFixed(2)}, ` +
          `G/L $${possibleGain.toFixed(2)}, ID: ${tradeSettings._id}`;
        LogData(tradeSettings, message);
      }
    } catch (ex) {
      timerHandle = clearInterval(timerHandle);
      // We have an emergency if this happens, so send communications.
      const message = `Trader has an exception in MonitorTradeToCloseItOut.`;
      LogData(tradeSettings, message, ex);
    }
  }, fiveSeconds);
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
        price = price + leg.price;
      } else {
        price = price - leg.price;
      }
    });
  });
  // For trigger orders, we recurse into the triggered childOrders
  if (order.childOrderStrategies) {
    order.childOrderStrategies.forEach((childOrder) => {
      price = price + calculateFillPrice(childOrder);
    });
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
      if (isOrderFilled) {
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

function calculateLimits(tradeSettings) {
  const {
    percentGain,
    percentLoss,
    openingPrice,
  } = tradeSettings;
  // If long entry, the openingPrice is negative (debit) and positive if short (credit).
  tradeSettings.gainLimit = Math.abs(openingPrice - openingPrice * percentGain);
  tradeSettings.lossLimit = Math.abs(openingPrice + openingPrice * percentLoss);
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
  tradeSettings.whenOpened = GetNewYorkTimeNowAsText();
  tradeSettings.monitoredPrices = [];
  calculateLimits(tradeSettings);
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
  const isMarketOpened = await IsOptionMarketOpenToday(userArch._id);
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
      LogData(null, `Scheduling opening trade for ${user.username} at ${desiredTradeTime.format('hh:mm a')}.`);
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
  ExecuteTrade,
  EmergencyCloseAllTrades,
};