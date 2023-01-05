// @ts-ignore
import {Meteor} from 'meteor/meteor';
// @ts-ignore
import {Email} from 'meteor/email';
import {
  CreateOpenAndCloseOrders,
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
import {TradeOrders} from './collections/TradeOrders';
import {TradeResults} from './collections/TradeResults';
import ITradeSettings, {GetDescription} from '../imports/Interfaces/ITradeSettings';
import {TradeSettings} from './collections/TradeSettings';
import {UserSettings} from './collections/UserSettings';
// @ts-ignore
import {Random} from 'meteor/random';
import _ from 'lodash';
import {LogData} from "./collections/Logs";
import SendOutInfo, {SendTextToAdmin} from './SendOutInfo';
import mutexify from 'mutexify/promise';

const lock = mutexify();

dayjs.extend(duration);
dayjs.extend(isoWeek);
const isoWeekdayNames = ['skip', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const fiveSeconds = 5000;

function consolidatedClearInterval(timerHandle) {
  console.error(`Clearing timerHandle: ${timerHandle}`);
  if (timerHandle) {
    Meteor.clearInterval(timerHandle);
  }
  return null;
}

function GetNewYorkTimeNowAsText() {
  const currentLocalTime = new Date();
  return currentLocalTime.toLocaleString('en-US', {timeZone: 'America/New_York'});
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
function GetNewYorkTimeAt(hour: number, minute: number) {
  const currentLocalTime = new Date();
  const currentNYTime = new Date(currentLocalTime.toLocaleString('en-US', {timeZone: 'America/New_York'}));
  let timeZoneDifference = currentNYTime.getHours() - currentLocalTime.getHours();
  const currentTimeZoneOffset = currentLocalTime.getTimezoneOffset() / 60;
  let nyTimeZoneOffsetFromCurrentTimeZone = Math.abs(currentTimeZoneOffset - timeZoneDifference);
  if (nyTimeZoneOffsetFromCurrentTimeZone > 12) {
    nyTimeZoneOffsetFromCurrentTimeZone = 24 - nyTimeZoneOffsetFromCurrentTimeZone;
  }
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
  let count = 0;
  while (count < 3) {
    try {
      result = null;
      const release = await lock();
      result = await GetPriceForOptions(tradeSettings);
      setTimeout(release, 1000);
      if (_.isFinite(result?.currentPrice)) {
        return result.currentPrice;
      }
      count++;
    } catch (ex) {
      console.error(`GetOptionsPriceLoop: Failed GetPriceForOptions.`, ex);
    }
  }
  const message = `GetOptionsPriceLoop: Failed to get currentPrice (probably too fast). User: ${tradeSettings.userName}`;
  console.error(message);
  return Number.NaN;
}

async function GetSmartOptionsPrice(tradeSettings: ITradeSettings) {
  const sampleSize = 2;
  let prices = [];
  for (let i = 0; i < sampleSize; i++) {
    const price = await GetOptionsPriceLoop(tradeSettings);
    if (_.isFinite(price)) {
      prices.push(price);
    }
  }
  if (prices.length > 0) {
    if (prices.length > 3) {
      // Remove the smallest number (index zero is filtered out since it's truthy is false).
      prices = prices.sort().filter((_, i) => i);
      // Remove the largest number
      prices = prices.slice(0, prices.length - 1);
    }
    const average = (array) => array.reduce((a, b) => a + b, 0) / array.length;
    return Math.abs(average(prices));
  }
  return Number.NaN;
}

async function CloseTrade(tradeSettings: ITradeSettings, currentPrice: number) {
  const {isMocked, userId, accountNumber, closingOrder, openingPrice} = tradeSettings;
  if (isMocked) {
    tradeSettings.closingOrderId = Random.id() + '_MOCKED';
    tradeSettings.closingPrice = currentPrice;
  } else {
    tradeSettings.closingOrderId = await PlaceOrder(userId, accountNumber, closingOrder).catch(error => {
      const msg = `CloseTrade ERROR. FAILED to close a trade!!! ${error.toString()}`;
      LogData(tradeSettings, msg, error);
      SendTextToAdmin(msg, msg);
      return null;
    });
    if (tradeSettings.closingOrderId) {
      tradeSettings.closingPrice = await WaitForOrderCompleted(userId, accountNumber, tradeSettings.closingOrderId).catch(reason => {
        const msg = `Exception waiting for order completion in CloseTrade: ${reason}.`;
        LogData(tradeSettings, msg, new Meteor.Error(msg));
        return 0;
      });
    }
  }
  tradeSettings.whenClosed = GetNewYorkTimeNowAsText();
  // Adding: one credit/sold, other debit/bought.
  tradeSettings.gainLoss = calculateGain(tradeSettings, tradeSettings.closingPrice);
  Trades.update(tradeSettings._id, {
    $set: {
      closingOrderId: tradeSettings.closingOrderId,
      closingPrice: tradeSettings.closingPrice,
      whyClosed: tradeSettings.whyClosed,
      whenClosed: tradeSettings.whenClosed,
      gainLoss: tradeSettings.gainLoss,
    }
  });
  const result: ITradeResults = {
    tradeId: tradeSettings._id,
    userId: tradeSettings.userId,
    symbol: tradeSettings.symbol,
    description: GetDescription(tradeSettings),
    quantity: tradeSettings.quantity,
    openingPrice: tradeSettings.openingPrice,
    closingPrice: tradeSettings.closingPrice,
    whenOpened: tradeSettings.whenOpened,
    whenClosed: tradeSettings.whenClosed,
    gainLoss: tradeSettings.gainLoss,
    isMocked: tradeSettings.isMocked,
    whyClosed: tradeSettings.whyClosed,
  };
  TradeResults.insert(result);
  const message = `${tradeSettings.userName}: Trade closed (${tradeSettings.whyClosed}): Entry: $${openingPrice.toFixed(2)}, ` +
    `Exit: $${tradeSettings.closingPrice?.toFixed(2)}, ` +
    `G/L $${tradeSettings.gainLoss?.toFixed(2)} at ${tradeSettings.whenClosed} NY, ID: ${tradeSettings._id}`;
  LogData(tradeSettings, message);
}

function EmergencyCloseAllTrades() {
  if (!Meteor.userId()) {
    throw new Meteor.Error('EmergencyCloseAllTrades: Must have valid user.');
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
      tradeSettings.whyClosed = 'emergencyExit';
      await CloseTrade(tradeSettings, exitPrice).catch(error => {
        LogData(tradeSettings, error.toString(), error);
      });
    });
    return `${result} Closed them all down.`;
  } catch (ex) {
    throw new Meteor.Error(`EmergencyCloseAllTrades: ${result}. Closing them failed with ${ex}`);
  }
}

function calculateGain(tradeSettings, currentPrice) {
  const {openingPrice, quantity} = tradeSettings;
  let possibleGain = (Math.abs(openingPrice) - currentPrice) * 100.0 * quantity;
  if (openingPrice > 0) {
    // We are in a long position.
    possibleGain = (Math.abs(currentPrice) - openingPrice) * 100.0 * quantity;
  }
  return possibleGain;
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
      if (activeTrade?.whyClosed || tradeSettings.whyClosed) {
        timerHandle = consolidatedClearInterval(timerHandle);
        // trade has been completed already (probably emergency exit) so stop the interval timer and exit.
        LogData(tradeSettings, `MonitorTradeToCloseItOut: Trade ${tradeSettings._id} closed async, so stopping monitoring.`);
        return;
      }
      // Get the current price for the trade.
      const currentPrice = await GetSmartOptionsPrice(tradeSettings);
      if (currentPrice === Number.NaN) {
        return; // Try again on next interval timeout.
      }
      const possibleGain = calculateGain(tradeSettings, currentPrice);
      // Record price value for historical reference and charting.
      const whenNY = GetNewYorkTimeNowAsText();
      Trades.update(tradeSettings._id, {
        $addToSet: {
          monitoredPrices: {
            price: currentPrice,
            whenNY,
            gain: possibleGain
          }
        }
      });
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
        timerHandle = consolidatedClearInterval(timerHandle);
        tradeSettings.whyClosed = 'gainLimit';
        if (isLossLimit) {
          tradeSettings.whyClosed = 'lossLimit';
        }
        if (isEndOfDay) {
          tradeSettings.whyClosed = 'timedExit';
        }
        await CloseTrade(tradeSettings, currentPrice).catch(reason => {
          const msg = `Exception with MonitorTradeToCloseItOut(interval) waiting CloseTrade: ${reason}.`;
          LogData(tradeSettings, msg, new Meteor.Error(msg));
        });
      }
    } catch (ex) {
      timerHandle = consolidatedClearInterval(timerHandle);
      // We have an emergency if this happens, so send communications.
      const message = `Trader has an exception in MonitorTradeToCloseItOut.`;
      LogData(tradeSettings, message, ex);
    }
  }, fiveSeconds);
}

function CalculateGrossOrderBuysAndSells(order) {
  const isBuyMap = {};
  // Define isBuyMap, so we know which legId is buy or sell.
  order.orderLegCollection.forEach((item) => {
    isBuyMap[item.legId] = item.instruction.startsWith('BUY');
  });
  let buyPrice = 0;
  let sellPrice = 0;
  // For all the executed legs, calculate the final price.
  order.orderActivityCollection?.forEach((item) => {
    item.executionLegs.forEach((leg) => {
      if (leg.price && leg.quantity) {
        if (isBuyMap[leg.legId]) {
          buyPrice += (leg.price * leg.quantity);
        } else {
          sellPrice -= (leg.price * leg.quantity);
        }
      }
    });
  });
  // For trigger orders, we recurse into the triggered childOrders
  if (order.childOrderStrategies) {
    order.childOrderStrategies.forEach((childOrder) => {
      const subCalcs = CalculateGrossOrderBuysAndSells(childOrder);
      buyPrice += subCalcs.buyPrice;
      sellPrice += subCalcs.sellPrice;
    });
  }
  return {buyPrice, sellPrice};
}

function CalculateFilledOrderPrice(order) {
  const grossPrices = CalculateGrossOrderBuysAndSells(order);
  return grossPrices.buyPrice / order.quantity + grossPrices.sellPrice / order.quantity;
}

function calculateIfOrderIsFilled(order) {
  let isFilled = (order?.status === 'FILLED');
  order?.childOrderStrategies?.forEach((childOrder) => isFilled = isFilled && calculateIfOrderIsFilled(childOrder));
  return isFilled;
}

async function WaitForOrderCompleted(userId, accountNumber, orderId) {
  return new Promise<number>(async (resolve, reject) => {
    let timerHandle = null;
    let counter = 0;
    timerHandle = Meteor.setInterval(async () => {
      try {
        const order = await GetOrders(userId, accountNumber, orderId);
        counter++;
        if (!order){
          LogData(null, `WaitForOrderCompleted Failed calling GetOrders.`, null);
          if (counter === 20) {
            const msg = `Order ${orderId} not obtained. Rejecting WaitForOrderCompleted.`;
            LogData(null, msg, null);
            reject(msg);
          }
          return;
        }
        const isOrderFilled = calculateIfOrderIsFilled(order);
        if (isOrderFilled || counter === 20) {
          timerHandle = consolidatedClearInterval(timerHandle);
          const calculatedFillPrice = CalculateFilledOrderPrice(order);
          TradeOrders.insert({_id: orderId, calculatedFillPrice, order});
          if (counter === 20) {
            const msg = `Order ${orderId} has failed to fill within the desired time. Using what completed.`;
            LogData(null, msg, null);
          }
          resolve(calculatedFillPrice);
        }
      } catch (ex) {
        timerHandle = consolidatedClearInterval(timerHandle);
        const msg = `Failed while WaitingForOrderCompleted.`;
        LogData(null, msg, ex);
        reject(`${msg} ${ex}`);
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
  // If long entry, the openingPrice is positive (debit) and negative if short (credit).
  if (openingPrice > 0) {
    tradeSettings.gainLimit = Math.abs(openingPrice + openingPrice * percentGain);
    tradeSettings.lossLimit = Math.abs(openingPrice - openingPrice * percentLoss);
  } else {
    tradeSettings.gainLimit = Math.abs(openingPrice - openingPrice * percentGain);
    tradeSettings.lossLimit = Math.abs(openingPrice + openingPrice * percentLoss);
  }
}

async function PlaceOpeningOrderAndMonitorToClose(tradeSettings: ITradeSettings) {
  let _id = Random.id();
  if (tradeSettings.isMocked) {
    _id = _id + '_MOCKED';
    tradeSettings.openingOrderId = _id;
    // tradeSettings.openingPrice has already been estimated when orders were created.
  } else {
    tradeSettings.openingOrderId = await PlaceOrder(tradeSettings.userId, tradeSettings.accountNumber, tradeSettings.openingOrder);
    tradeSettings.openingPrice = await WaitForOrderCompleted(tradeSettings.userId, tradeSettings.accountNumber, tradeSettings.openingOrderId)
      .catch(() => 0);
  }
  tradeSettings._id = _id; // Switch _id for storing into Trades collection.
  tradeSettings.whenOpened = GetNewYorkTimeNowAsText();
  tradeSettings.monitoredPrices = [];
  calculateLimits(tradeSettings);
  // Record this opening order data.
  Trades.insert({...tradeSettings});
  if (_.isFinite(tradeSettings.openingPrice)) {
    MonitorTradeToCloseItOut(tradeSettings);
  }
  return;
}

async function ExecuteTrade(tradeSettings: ITradeSettings, forceTheTrade = false) {
  const now = dayjs();
  const nowNYText = now.toDate().toLocaleString('en-US', {timeZone: 'America/New_York'});
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
      LogData(tradeSettings, `Trading for ${tradeSettings.userName} @ ${nowNYText} (NY) with ${JSON.stringify(tradeSettings)}`);
      // Place the opening trade and monitor it to later close it out.
      const chains = await GetATMOptionChains(tradeSettings);
      // The trade orders are assigned to the tradeSettings object.
      const ordersReady = CreateOpenAndCloseOrders(chains, tradeSettings);
      if (ordersReady) {
        await PlaceOpeningOrderAndMonitorToClose(tradeSettings);
      }
    } catch (ex) {
      const when = dayjs();
      const msg = `ExecuteTrade failed with user ${tradeSettings.userName} at ${when.format('MMM DD, YYYY hh:mm:ssa')}. Exception: ${ex}`;
      LogData(tradeSettings, msg, ex);
    }
  } else {
    const msg = `Skipping a trade setting for ${tradeSettings.userName} @ ${nowNYText} (NY). \
Is Not Active: ${!tradeSettings.isActive}, Too Close To Closing Time: ${!notTooLateToTrade}, \
Not This Day Of The Week: ${!tradePatternIncludesThisDayOfTheWeek}, \
No Legs: ${!hasLegsInTrade} with ${JSON.stringify(tradeSettings)}`;
    LogData(tradeSettings, msg);
  }
}

async function queueUsersTradesForTheDay(user) {
  const accountNumber = UserSettings.findOne(user._id)?.accountNumber;
  if (!accountNumber || accountNumber === 'None') {
    LogData(null, `User ${user.username} has no account number so skipping this user.`, null);
    return;
  }
  let countOfUsersTradesStarted = 0;
  const tradeSettingsSet = TradeSettings.find({userId: user._id}).fetch();
  tradeSettingsSet.forEach((tradeSettings: ITradeSettings) => {
    try {
      const desiredTradeTime = GetNewYorkTimeAt(tradeSettings.entryHour, tradeSettings.entryMinute);
      let delayInMilliseconds = dayjs.duration(desiredTradeTime.diff(dayjs())).asMilliseconds();
      if (delayInMilliseconds < 0) {
        delayInMilliseconds = 0;
      }
      tradeSettings.accountNumber = accountNumber;
      tradeSettings.userName = user.username;
      countOfUsersTradesStarted++;
      LogData(tradeSettings, `Scheduling opening trade for ${user.username} at ${desiredTradeTime.format('hh:mm a')}.`);
      let timeoutHandle = Meteor.setTimeout(async () => {
        if (timeoutHandle) {
          Meteor.clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        await ExecuteTrade(tradeSettings)
          .catch((reason) => {
            LogData(tradeSettings, `Failed to ExecuteTrade ${user.username}. Reason: ${reason}`);
          });
      }, delayInMilliseconds);
    } catch (ex) {
      LogData(tradeSettings, `Failed to schedule opening trade ${user.username}.`);
    }
  });
  LogData(null, `Scheduled ${countOfUsersTradesStarted} trades for user ${user.username} today.`);
}

async function PerformTradeForAllUsers() {
  LogData(null, `Entering "Perform Trade For All Users"...`, null);
  const userArch = Users.findOne({username: 'Arch'});
  const isMarketOpened = await IsOptionMarketOpenToday(userArch._id);
  if (!isMarketOpened) {
    LogData(null, 'Market is closed today');
    return;
  }
  const users = Users.find().fetch();
  users.forEach(queueUsersTradesForTheDay);
}

export {
  WaitForOrderCompleted,
  MonitorTradeToCloseItOut,
  GetNewYorkTimeAt,
  PerformTradeForAllUsers,
  ExecuteTrade,
  EmergencyCloseAllTrades,
};