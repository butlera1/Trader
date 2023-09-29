// @ts-ignore
import {Meteor} from 'meteor/meteor';
import {
  CreateOpenAndCloseOrders,
  GetATMOptionChains,
  GetOrders,
  GetPriceForOptions,
  IsOptionMarketOpenToday,
  PlaceOrder,
} from './TDAApi/TDAApi.js';
import {Users} from './collections/users';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isoWeek from 'dayjs/plugin/isoWeek';
import {Trades} from './collections/Trades';
import ITradeSettings, {
  BadDefaultIPrice,
  DefaultIPrice,
  IPrice,
  whyClosedEnum
} from '../imports/Interfaces/ITradeSettings';
import {TradeSettings} from './collections/TradeSettings';
import {UserSettings} from './collections/UserSettings';
import {DailyTradeSummaries, IDailyTradeSummary} from './collections/DailyTradeSummaries';
// @ts-ignore
import {Random} from 'meteor/random';
import _ from 'lodash';
import {LogData} from './collections/Logs';
import {SendTextToAdmin} from './SendOutInfo';
import PollingMutex from './PollingMutex';
import {
  CalculateGain,
  CalculateLimitsAndFees,
  CalculateUnderlyingPriceAverageSlope,
  GetNewYorkTimeAt
} from '../imports/Utils';
import Semaphore from 'semaphore';
import {CalculateVWAP, GetVWAPMark, GetVWAPMarkMax, GetVWAPMarkMin, GetVWAPSlopeAngle} from './TDAApi/StreamEquities';
import IUserSettings from '../imports/Interfaces/IUserSettings';
import {GetVIXMark, GetVIXSlope, GetVIXSlopeAngle} from "./BackgroundPolling";

dayjs.extend(duration);
dayjs.extend(isoWeek);

const isoWeekdayNames = ['skip', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const oneSeconds = 1000;

function GetNewYorkTimeNowAsText() {
  const currentLocalTime = new Date();
  return currentLocalTime.toLocaleString('en-US', {timeZone: 'America/New_York'});
}

function GetNewYorkTime24HourNow() {
  const text = GetNewYorkTimeNowAsText();
  const parts = text.split(' ');
  const hour = parseInt(parts[1].split(':')[0], 10);
  const additionalHours = (parts[2] === 'PM' && hour != 12) ? 12 : 0;
  return hour + additionalHours;
}

async function GetOptionsPriceLoop(tradeSettings: ITradeSettings): Promise<IPrice> {
  let result: IPrice = {...BadDefaultIPrice};
  const tripleAbsOpenPrice = Math.abs(tradeSettings.openingPrice) * 3;
  let count = 0;
  while (count < 3) {
    try {
      result = null;
      const release = await PollingMutex();
      result = await GetPriceForOptions(tradeSettings);
      setTimeout(() => {
        release();
      }, 1000);
      if (_.isFinite(result.price)) {
        if (Math.abs(result.price) > tripleAbsOpenPrice) {
          console.error(`***************    GetOptionsPriceLoop: ABSOLUTE PRICE IS GREATER THAN TRIPLE THE ABSOLUTE OPENING PRICE.`,
            Math.abs(tradeSettings.openingPrice), Math.abs(result.price));
        }
        return result;
      }
      count++;
    } catch (ex) {
      console.error(`GetOptionsPriceLoop: Failed GetPriceForOptions.`, ex);
    }
  }
  const message = `***************    GetOptionsPriceLoop: Failed to get currentPrice (probably too fast). User: ${tradeSettings.userName}, ${tradeSettings.csvSymbols}`;
  console.error(message);
  return result;
}

async function GetSmartOptionsPrice(tradeSettings: ITradeSettings): Promise<IPrice> {
  const sampleSize = 1;
  let prices = [];
  let lastSample: IPrice = {...BadDefaultIPrice};
  for (let i = 0; i < sampleSize; i++) {
    lastSample = await GetOptionsPriceLoop(tradeSettings);
    if (_.isFinite(lastSample.price)) {
      prices.push(lastSample.price);
    }
  }
  if (prices.length > 2) {
    if (prices.length > 3) {
      // Sort the array and remove the smallest and largest numbers (aberrations).
      prices = prices.sort().slice(1, prices.length - 1);
    }
    const average = (array) => array.reduce((a, b) => a + b, 0) / array.length;
    lastSample.price = Math.abs(average(prices));
  }
  return lastSample;
}

/**
 * Saves the daily trades as a single daily record. Sums up the total gain/loss for the day as well.
 * Does not inclulde pre-running trades in the summing.
 * @param tradeSettings
 */
function saveTradeToHistory(tradeSettings: ITradeSettings) {
  const dateText = dayjs().format('YYYY-MM-DD');
  const {userId, accountNumber} = tradeSettings;
  const summary: IDailyTradeSummary = DailyTradeSummaries.findOne({userId, accountNumber, dateText}) || {
    gainLoss: 0,
    tradeIds: [],
    userId,
    accountNumber,
    dateText
  };
  const id = summary._id || Random.id();
  delete summary._id;
  if (!tradeSettings.isPrerunningVWAPSlope && !tradeSettings.isPrerunning) {
    // Don't record any pre-running trades.
    summary.gainLoss += tradeSettings.gainLoss;
  }
  summary.tradeIds.push(tradeSettings._id);
  const userSettings: IUserSettings = UserSettings.findOne({_id: userId});
  if (summary.gainLoss < -Math.abs(userSettings.maxAllowedDailyLoss)) {
    // User has lost too much money today.  Disable their account.
    UserSettings.update({_id: userId}, {$set: {accountIsActive: false}});
    EmergencyCloseAllTradesForUser(userId);
  }
  DailyTradeSummaries.upsert(id, summary);
}

async function CloseTrade(tradeSettings: ITradeSettings, currentPrice: number) {
  const {isMocked, userId, accountNumber, closingOrder, openingPrice} = tradeSettings;
  if (isMocked) {
    tradeSettings.closingOrderId = Random.id() + '_MOCKED';
    tradeSettings.closingPrice = currentPrice;
  } else {
    tradeSettings.closingOrderId = await PlaceOrder(userId, accountNumber, closingOrder).catch(reason => {
      const msg = `CloseTrade ERROR. FAILED to close a trade!!! ${reason.toString()}`;
      LogData(tradeSettings, msg, reason);
      SendTextToAdmin(msg, msg);
      return null;
    });
    if (tradeSettings.closingOrderId) {
      const priceResults = await WaitForOrderCompleted(userId, accountNumber, tradeSettings.closingOrderId).catch(reason => {
        const msg = `Exception waiting for order completion in CloseTrade: ${reason}.`;
        LogData(tradeSettings, msg, new Meteor.Error('FailedOrderCompletion', msg));
        return {orderPrice: Number.NaN, shortOnlyPrice: Number.NaN};
      });
      // The following cast should not be needed but typescript is complaining.
      const castPriceResults = priceResults as IOrderPriceResults;
      tradeSettings.closingPrice = castPriceResults?.orderPrice ?? Number.NaN;
    }
  }
  if (Number.isNaN(tradeSettings.closingPrice)) {
    const msg = `CloseTrade ERROR. Closing price === NA. Setting it to openingPrice!!!`;
    LogData(tradeSettings, msg, new Meteor.Error('FailedCloseTrade', msg));
    tradeSettings.closingPrice = openingPrice;
    tradeSettings.isCopiedOpenPriceToClosePrice = true;
  }
  tradeSettings.whenClosed = new Date();
  tradeSettings.gainLoss = CalculateGain(tradeSettings, tradeSettings.closingPrice);
  Trades.update(tradeSettings._id, {
    $set: {
      closingOrderId: tradeSettings.closingOrderId,
      closingPrice: tradeSettings.closingPrice,
      whyClosed: tradeSettings.whyClosed,
      whenClosed: tradeSettings.whenClosed,
      gainLoss: tradeSettings.gainLoss,
    }
  });
  saveTradeToHistory(tradeSettings);
  const wasPrerunning = tradeSettings.isPrerunning;
  const wasPrerunningVWAPSlope = tradeSettings.isPrerunningVWAPSlope;
  const message = `${tradeSettings.userName}: Trade closed (${tradeSettings.whyClosed}): Entry: $${openingPrice.toFixed(2)}, ` +
    `Exit: $${tradeSettings.closingPrice?.toFixed(2)}, ` +
    `G/L $${tradeSettings.gainLoss?.toFixed(2)} at ${tradeSettings.whenClosed} NY, _ID: ${tradeSettings._id}`;
  LogData(tradeSettings, message);
  // See if we should repeat the trade now that it is closed.
  let notTooLate = true;
  if (tradeSettings.isRepeat) {
    notTooLate = (GetNewYorkTime24HourNow() < (tradeSettings.repeatStopHour ?? 16));
  }
  const okToRepeat = (tradeSettings.whyClosed !== whyClosedEnum.emergencyExit) &&
    (tradeSettings.whyClosed !== whyClosedEnum.timedExit) &&
    (notTooLate);
  if ((tradeSettings.isRepeat || wasPrerunning || wasPrerunningVWAPSlope) && okToRepeat) {
    // Get fresh copy of the settings without values for whyClosed, openingPrice, closingPrice, gainLoss, etc.
    const settings = TradeSettings.findOne(tradeSettings.originalTradeSettingsId);
    if (!settings) {
      const msg = `Failed to get originalTradeSettingsId: ${tradeSettings.originalTradeSettingsId} after closing a trade.`;
      LogData(tradeSettings, msg, new Error(msg));
    } else {
      let nowPrerunning = wasPrerunning ? false : settings.isPrerun;
      // If wasPrerunning, and we exited for something other than (gainLimit or prerunExit), restart a prerun.
      if (wasPrerunning && tradeSettings.whyClosed !== whyClosedEnum.gainLimit && tradeSettings.whyClosed !== whyClosedEnum.prerunExit) {
        nowPrerunning = true; // Do another prerun because we exited for loss limit or similar.
      }
      let nowPrerunningVWAPSlope = wasPrerunningVWAPSlope ? false : settings.isPrerunVWAPSlope;
      // If wasPrerunningVWAPSlope and we exited for something other than (gainLimit or prerunSlopeExit), restart a prerun.
      if (wasPrerunningVWAPSlope && tradeSettings.whyClosed !== whyClosedEnum.gainLimit && tradeSettings.whyClosed !== whyClosedEnum.prerunVWAPSlopeExit) {
        nowPrerunningVWAPSlope = true; // Do another prerunSlope because we exited for loss limit or similar.
      }
      if (tradeSettings.isPrerunVWAPSlope && tradeSettings.whyClosed == whyClosedEnum.gainLimit) {
        // If the setting is enabled and we just got a gainLimit, don't go back to prerunSlope again.
        nowPrerunningVWAPSlope = false;
      }
      ExecuteTrade(settings, false, nowPrerunning, nowPrerunningVWAPSlope)
        .then()
        .catch((reason) => LogData(tradeSettings, `Failed doing a repeat ExecuteTrade ${reason}`, new Error(reason)));
    }
  }
}

function EmergencyCloseAllTradesForUser(userId: string) {
  let result = '';
  try {
    // Find all live trades for this user.
    const liveTrades = Trades.find({userId: userId, whyClosed: {$exists: false}}).fetch();
    result = `Found ${liveTrades.label} trades.`;
    liveTrades.forEach(async (tradeSettings) => {
      // Get the last recorded price for this trade and use it for the exit price if in mocked mode.
      // Note the closingPrice defaults to the NEGATIVE of the openingPrice.
      let exitPrice = -tradeSettings.openingPrice;
      if (tradeSettings.monitoredPrices?.length > 0) {
        exitPrice = tradeSettings.monitoredPrices[tradeSettings.monitoredPrices.length - 1].price;
      }
      tradeSettings.whyClosed = whyClosedEnum.emergencyExit;
      await CloseTrade(tradeSettings, exitPrice).catch(reason => {
        LogData(tradeSettings, reason.toString(), reason);
      });
    });
    return `${result} Closed them all down.`;
  } catch (ex) {
    throw new Meteor.Error(`EmergencyCloseAllTrades: ${result}. Closing them failed with ${ex}`);
  }
}

function EmergencyCloseAllTrades() {
  if (!Meteor.userId()) {
    throw new Meteor.Error('EmergencyCloseAllTrades: Must have valid user.');
  } else {
    EmergencyCloseAllTradesForUser(Meteor.userId());
  }
}

function getTradeDurationInMinutes(tradeSettings: ITradeSettings) {
  const initialTime = tradeSettings.monitoredPrices[0] ? dayjs(tradeSettings.monitoredPrices[0].whenNY) : dayjs();
  const latestTime = tradeSettings.monitoredPrices[tradeSettings.monitoredPrices.length - 1] ? dayjs(tradeSettings.monitoredPrices[tradeSettings.monitoredPrices.length - 1].whenNY) : dayjs();
  return latestTime.diff(initialTime, 'minute', true);
}

/**
 * Return true if profitable after a set number of minutes.
 * @param tradeSettings
 * @param currentSample
 */
function checkRule1Exit(liveTrade: ITradeSettings, currentSample: IPrice) {
  if (liveTrade.isRule1) {
    const duration = getTradeDurationInMinutes(liveTrade);
    const desiredGain = CalculateGain(liveTrade, liveTrade.gainLimit) * liveTrade.rule1Value.profitPercent;
    let isGainLimit = (currentSample.gain > desiredGain);
    return (duration > liveTrade.rule1Value.minutes) && (isGainLimit);
  }
  return false;
}

function getLongShortSeparation(initialSample, sample) {
  if (!initialSample) return 0;
  const longDelta = Math.abs(sample.longStraddlePrice) - Math.abs(initialSample.longStraddlePrice);
  const shortDelta = Math.abs(initialSample.shortStraddlePrice) - Math.abs(sample.shortStraddlePrice);
  return (longDelta + shortDelta);
}

function getUnderlyingMovement(initialSample: IPrice, sample: IPrice) {
  if (!initialSample) return 0;
  const movement = Math.abs(sample.underlyingPrice) - Math.abs(initialSample.underlyingPrice);
  return movement;
}

/**
 * Exit if the long and short straddles separation is inverted to too long.
 * @param liveTrade
 * @param currentSample
 */
function checkRule2Exit(liveTrade: ITradeSettings, currentSample: IPrice) {
  if (liveTrade.isRule2) {
    const ticks = liveTrade.rule2Value?.ticks ?? 0;
    const amount = liveTrade.rule2Value?.amount ?? 0;
    const length = liveTrade.monitoredPrices.length;
    if (ticks <= length) {
      const initialSample = liveTrade.monitoredPrices[0];
      const samples = liveTrade.monitoredPrices.slice(length - ticks);
      for (let i = 0; i < ticks; i++) {
        const delta = getLongShortSeparation(initialSample, samples[i]);
        const inverted = delta < -amount;
        if (!inverted) {
          return false;
        }
      }
      return true;
    }
  }
  return false;
}

function getMaximumPercentGainReached(liveTrade: ITradeSettings) {
  if (liveTrade.monitoredPrices.length === 0) return 0;
  const maxGain = liveTrade.monitoredPrices.reduce((max, sample) => sample.gain > max.gain ? sample : max, liveTrade.monitoredPrices[0]);
  const maxGainDollar = CalculateGain(liveTrade, liveTrade.gainLimit);
  return maxGain.gain / maxGainDollar;
}

function checkRule3Exit(liveTrade: ITradeSettings, currentSample: IPrice) {
  if (liveTrade.isRule3 && !liveTrade.isPrerunning) {
    const desiredMinutes = liveTrade.rule3Value?.minutes ?? 0;
    const desiredGainPercent = liveTrade.rule3Value?.gainPercent ?? 0;
    const trailingStopPercent = liveTrade.rule3Value?.trailingStopPercent ?? 0;
    const durationInMinutes = getTradeDurationInMinutes(liveTrade);
    const maximumPercentGainReached = getMaximumPercentGainReached(liveTrade);
    if (desiredMinutes <= durationInMinutes && maximumPercentGainReached > desiredGainPercent) {
      const trailingStopGainPercent = maximumPercentGainReached - maximumPercentGainReached * trailingStopPercent;
      const currentGainPercent = currentSample.gain / CalculateGain(liveTrade, liveTrade.gainLimit);
      if (currentGainPercent < trailingStopGainPercent) return true;
    }
  }
  return false;
}

function checkRule4Exit(liveTrade: ITradeSettings, currentSample: IPrice) {
  if (liveTrade.isRule4) {
    const desiredMinutes = liveTrade.rule4Value?.minutes ?? 0;
    const desiredMovement = liveTrade.rule4Value?.underlyingMovement ?? 0;
    const durationInMinutes = getTradeDurationInMinutes(liveTrade);
    const underlyingMovement = Math.abs(getUnderlyingMovement(liveTrade.monitoredPrices[0], currentSample));
    return (desiredMinutes <= durationInMinutes && underlyingMovement >= desiredMovement);
  }
  return false;
}

function checkRule5Exit(liveTrade: ITradeSettings, currentSample: IPrice) {
  if (liveTrade.isRule5) {
    const desiredMinutes = liveTrade.rule5Value?.minutes ?? 0;
    const desiredMovement = Math.abs(liveTrade.rule5Value?.underlyingPercentOfCredit * liveTrade.openingPrice ?? 0);
    const durationInMinutes = getTradeDurationInMinutes(liveTrade);
    const underlyingMovement = Math.abs(getUnderlyingMovement(liveTrade.monitoredPrices[0], currentSample));
    return (desiredMinutes <= durationInMinutes && underlyingMovement >= desiredMovement);
  }
  return false;
}

function checkPrerunExit(liveTrade: ITradeSettings) {
  if (liveTrade.isPrerunning) {
    const ticks = liveTrade.prerunValue?.ticks ?? 0;
    const desiredSeparation = liveTrade.prerunValue?.amount ?? 0;
    const length = liveTrade.monitoredPrices.length;
    const initialSample = liveTrade.monitoredPrices[0];
    if (ticks <= length) {
      let isGainMet = true;
      const samples = liveTrade.monitoredPrices.slice(length - ticks);
      for (let i = 0; i < ticks; i++) {
        const delta = getLongShortSeparation(initialSample, samples[i]);
        const haveSeparation = delta > desiredSeparation;
        isGainMet = isGainMet && haveSeparation && (samples[i].gain > 0);
        if (!isGainMet) break;
      }
      return isGainMet;
    }
  }
  return false;
}

function checkPrerunVWAPSlopeExit(liveTrade: ITradeSettings) {
  if (liveTrade.isPrerunningVWAPSlope) {
    const numberOfDesiredVWAPAnglesInARow = liveTrade.prerunVWAPSlopeValue.numberOfDesiredVWAPAnglesInARow ?? 4;
    if (liveTrade.monitoredPrices.length >= numberOfDesiredVWAPAnglesInARow) {
      // This approach is for checking for slope trending up (increasing in value
      const samples = liveTrade.monitoredPrices.slice(liveTrade.monitoredPrices.length - numberOfDesiredVWAPAnglesInARow);
      let trendingUp = true;
      for (let i = 0; i < samples.length - 1; i++) {
        trendingUp = trendingUp && samples[i].vwapSlopeAngle <= samples[i + 1].vwapSlopeAngle;
      }
      return trendingUp;

      //
      // This is the approach for checking for positive slope.
      // const samples = liveTrade.monitoredPrices.slice(liveTrade.monitoredPrices.length - numberOfDesiredVWAPAnglesInARow);
      // const isPositive = samples.reduce((isPositive, sample) => isPositive && sample.vwapSlopeAngle >= 0, true);
      // return isPositive;
      //
    }
  }
  return false;
}

function getAveragePrice(samples: IPrice[], desiredNumberOfSamples: number) {
  const numberOfSamples = Math.min(desiredNumberOfSamples, samples.length);
  if (numberOfSamples === 0) return 0;
  // Get the last numberOfSamples samples.
  const subSet = samples.slice(samples.length - numberOfSamples);
  const sum = subSet.reduce((sum, sample) => sum + sample.price, 0);
  return sum / numberOfSamples;
}

function calculateVariousValues(liveTrade: ITradeSettings, currentSample: IPrice) {
  currentSample.gain = CalculateGain(liveTrade, currentSample.price);
  liveTrade.monitoredPrices.push(currentSample); // Update the local copy.
  currentSample.vixMark = GetVIXMark();
  currentSample.vixSlopeAngle = GetVIXSlopeAngle();
  currentSample.vixSlope = GetVIXSlope();
  // Record price value for historical reference and charting.
  Trades.update(liveTrade._id, {$addToSet: {monitoredPrices: currentSample}});
}

function MonitorTradeToCloseItOut(liveTrade: ITradeSettings) {
  const localEarlyExitTime = GetNewYorkTimeAt(liveTrade.exitHour, liveTrade.exitMinute);
  const monitorMethod = async () => {
    try {
      // The latestActiveTradeRecord can be updated via an 'Emergency Exit' call so check it along with the liveTrade.
      const latestActiveTradeRecord = Trades.findOne(liveTrade._id) ?? {};
      const isClosedAlready = !!(latestActiveTradeRecord.whyClosed || liveTrade.whyClosed);
      if (isClosedAlready) {
        // trade has been completed already (probably emergency exit) so stop the interval timer and exit.
        LogData(liveTrade, `MonitorTradeToCloseItOut: Trade ${liveTrade._id} closed async, so stopping monitoring.`);
        return;
      }
      // Get the current price for the trade.
      const currentSamplePrice: IPrice = await GetSmartOptionsPrice(liveTrade);
      if (currentSamplePrice.price === Number.NaN || currentSamplePrice.price === 0) {
        Meteor.setTimeout(monitorMethod, oneSeconds);
        return; // Try again on next interval timeout.
      }
      calculateVariousValues(liveTrade, currentSamplePrice);
      const localNow = dayjs();
      const isEndOfDay = localEarlyExitTime.isBefore(localNow);
      const absAveragePrice = Math.abs(getAveragePrice(liveTrade.monitoredPrices, 2));
      const absCurrentPrice = Math.abs(currentSamplePrice.price);
      let isGainLimit = (absCurrentPrice <= liveTrade.gainLimit);
      // Using average on loss to make sure a spike does not trigger a loss exit.
      let isLossLimit = (absAveragePrice >= liveTrade.lossLimit);
      if (liveTrade.openingPrice > 0) { // Means we are long the trade (we want values to go up).
        isGainLimit = (absCurrentPrice >= liveTrade.gainLimit);
        isLossLimit = (absAveragePrice <= liveTrade.lossLimit);
      }
      const isRule1Exit = checkRule1Exit(liveTrade, currentSamplePrice);
      const isRule2Exit = checkRule2Exit(liveTrade, currentSamplePrice);
      const isRule3Exit = checkRule3Exit(liveTrade, currentSamplePrice);
      const isRule4Exit = checkRule4Exit(liveTrade, currentSamplePrice);
      const isRule5Exit = checkRule5Exit(liveTrade, currentSamplePrice);
      const isPrerunExit = checkPrerunExit(liveTrade);
      const isPrerunVWAPSlopeExit = checkPrerunVWAPSlopeExit(liveTrade);
      if (isGainLimit || isLossLimit || isEndOfDay || isRule1Exit || isRule2Exit || isRule3Exit || isRule4Exit || isRule5Exit || isPrerunExit || isPrerunVWAPSlopeExit) {
        liveTrade.whyClosed = whyClosedEnum.gainLimit;
        if (isRule1Exit) {
          liveTrade.whyClosed = whyClosedEnum.rule1Exit;
        }
        if (isRule2Exit) {
          liveTrade.whyClosed = whyClosedEnum.rule2Exit;
        }
        if (isRule3Exit) {
          liveTrade.whyClosed = whyClosedEnum.rule3Exit;
        }
        if (isRule4Exit) {
          liveTrade.whyClosed = whyClosedEnum.rule4Exit;
        }
        if (isRule5Exit) {
          liveTrade.whyClosed = whyClosedEnum.rule5Exit;
        }
        if (isPrerunExit) {
          liveTrade.whyClosed = whyClosedEnum.prerunExit;
        }
        if (isPrerunVWAPSlopeExit) {
          liveTrade.whyClosed = whyClosedEnum.prerunVWAPSlopeExit;
        }
        if (isLossLimit) {
          liveTrade.whyClosed = whyClosedEnum.lossLimit;
        }
        if (isEndOfDay) {
          liveTrade.whyClosed = whyClosedEnum.timedExit;
        }
        await CloseTrade(liveTrade, currentSamplePrice.price).catch(reason => {
          const msg = `Exception with MonitorTradeToCloseItOut waiting CloseTrade: ${reason}.`;
          LogData(liveTrade, msg, new Meteor.Error(reason, msg));
        });
      } else {
        // Loop again waiting for one of the close patterns to get hit.
        Meteor.setTimeout(monitorMethod, oneSeconds);
      }
    } catch (ex) {
      // We have an emergency if this happens, so send communications.
      const message = `Trader has an exception in MonitorTradeToCloseItOut.`;
      LogData(liveTrade, message, ex);
    }
  };
  Meteor.setTimeout(monitorMethod, oneSeconds);
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

function CalculateFilledOrderPrice(order): IOrderPriceResults {
  const grossPrices = CalculateGrossOrderBuysAndSells(order);
  const orderPrice = grossPrices.buyPrice + grossPrices.sellPrice;
  return {orderPrice, shortOnlyPrice: grossPrices.sellPrice};
}

function calculateIfOrderIsFilled(order) {
  let isFilled = (order?.status === 'FILLED');
  order?.childOrderStrategies?.forEach((childOrder) => isFilled = isFilled && calculateIfOrderIsFilled(childOrder));
  return isFilled;
}

const fiveSeconds = 5000;

interface IOrderPriceResults {
  orderPrice: number;
  shortOnlyPrice: number;
}

async function WaitForOrderCompleted(userId, accountNumber, orderId) {
  return new Promise<IOrderPriceResults>(async (resolve, reject) => {
    let counter = 0;
    const worker = async () => {
      try {
        const order = await GetOrders(userId, accountNumber, orderId);
        counter++;
        if (!order) {
          if (counter >= 20) {
            const msg = `Order ${orderId} not obtained. Exiting WaitForOrderCompleted.`;
            LogData(null, msg, null);
            reject(msg);
            return;
          }
          // Try again ...
          Meteor.setTimeout(worker, fiveSeconds);
          return;
        }
        const isOrderFilled = calculateIfOrderIsFilled(order);
        if (isOrderFilled) {
          const priceResults = CalculateFilledOrderPrice(order);
          resolve(priceResults);
          return;
        }
        if (counter >= 20) {
          const msg = `WaitForOrderCompleted: Order ${orderId} has failed to fill within the desired time.`;
          LogData(null, msg, null);
          reject(msg);
          return;
        }
        if (order.status === 'REJECTED' || order.status === 'CANCELED') {
          const msg = `WaitForOrderCompleted: Order ${orderId} has been ${order.status}. (RETRYING)`;
          LogData(null, msg, null);
          reject(msg);
          return;
        }
        Meteor.setTimeout(worker, fiveSeconds);
      } catch (ex) {
        const msg = `Failed while WaitingForOrderCompleted.`;
        LogData(null, msg, ex);
        reject(`${msg} ${ex}`);
      }
    };
    Meteor.setTimeout(worker, fiveSeconds);
  });
}

async function PlaceOpeningOrderAndMonitorToClose(tradeSettings: ITradeSettings) {
  if (tradeSettings.isMocked) {
    tradeSettings.openingOrderId = Random.id() + '_MOCKED';
    // tradeSettings.openingPrice has already been estimated when orders were created.
    // tradeSettings.openingShortOnlyPrice has already been estimated when orders were created.
  } else {
    tradeSettings.openingOrderId = await PlaceOrder(tradeSettings.userId, tradeSettings.accountNumber, tradeSettings.openingOrder);
    const priceResults = await WaitForOrderCompleted(tradeSettings.userId, tradeSettings.accountNumber, tradeSettings.openingOrderId)
      .catch(() => {
        return {orderPrice: 0, shortOnlyPrice: 0};
      });
    if (priceResults?.orderPrice) {
      tradeSettings.openingPrice = priceResults.orderPrice;
      tradeSettings.openingShortOnlyPrice = priceResults.shortOnlyPrice;
    }
  }

  tradeSettings.originalTradeSettingsId = tradeSettings._id;
  delete tradeSettings._id; // Remove the old _id for so when storing into Trades collection, a new _id is created.
  tradeSettings.whenOpened = new Date();
  tradeSettings.monitoredPrices = [];
  CalculateLimitsAndFees(tradeSettings);
  // Record this opening order data as a new active trade.
  tradeSettings._id = Trades.insert({...tradeSettings});
  LogData(tradeSettings, `DEBUG: Just inserted new Trades: ${tradeSettings._id} for ${tradeSettings.userName}`);
  const currentSample: IPrice = {
    ...DefaultIPrice,
    price: -tradeSettings.openingPrice, // Negative for monitoring to close the trade.
    whenNY: tradeSettings.whenOpened,
    underlyingPrice: tradeSettings.openingUnderlyingPrice,
  };
  calculateVariousValues(tradeSettings, currentSample);

  if (_.isFinite(tradeSettings.openingPrice)) {
    MonitorTradeToCloseItOut(tradeSettings);
  } else {
    LogData(tradeSettings, `Error: Opening order for trade: ${tradeSettings._id}, ${tradeSettings.userName} has bad opening price.`, null);
  }
  return;
}

function IsNotDuplicateTrade(tradeSettings: ITradeSettings) {
  const existingTrade = Trades.findOne({
    userName: tradeSettings.userName,
    symbol: tradeSettings.symbol,
    originalTradeSettingsId: tradeSettings._id,
    whenClosed: {$exists: false},
  });
  return !existingTrade;
}

async function ExecuteTrade(tradeSettings: ITradeSettings, forceTheTrade = false, isPrerun = false, isPrerunVWAPSlope = false) {
  if (!tradeSettings) {
    const msg = `ExecuteTrade called without 'tradeSettings'.`;
    LogData(null, msg, new Error(msg));
    return;
  }
  const userSettings: IUserSettings = UserSettings.findOne({_id: tradeSettings.userId});
  if (!userSettings?.accountIsActive) {
    LogData(tradeSettings, `ExecuteTrade called for ${tradeSettings.userName} but account is not active.`, null);
    return;
  }
  const now = dayjs();
  const nowNYText = now.toDate().toLocaleString('en-US', {timeZone: 'America/New_York'});
  const currentDayOfTheWeek = isoWeekdayNames[now.isoWeekday()];
  const justBeforeClose = GetNewYorkTimeAt(15, 55);
  const notTooLateToTrade = now.isBefore(justBeforeClose);
  const tradePatternIncludesThisDayOfTheWeek = tradeSettings.days?.includes(currentDayOfTheWeek);
  const hasLegsInTrade = tradeSettings.legs.length > 0;
  const tradeIsNotADuplicate = IsNotDuplicateTrade(tradeSettings);
  const isADuplicateTrade = !tradeIsNotADuplicate;
  const performTheTrade = (
    tradeSettings.isActive &&
    notTooLateToTrade &&
    tradePatternIncludesThisDayOfTheWeek &&
    hasLegsInTrade &&
    tradeIsNotADuplicate
  );
  if (isADuplicateTrade && !forceTheTrade) {
    // Write logs indicating that this happened and is not desired.
    const msg = `ExecuteTrade: Duplicated trade for ${tradeSettings.userName} with trade ${tradeSettings.description}. Skipping this additional trade.`;
    LogData(tradeSettings, msg, new Meteor.Error(msg));
  }
  if (forceTheTrade || performTheTrade) {
    try {
      // Make sure we have latest userSettings for this new trade about to happen.
      tradeSettings.accountNumber = userSettings.accountNumber;
      tradeSettings.phone = userSettings.phone;
      tradeSettings.emailAddress = userSettings.email;
      tradeSettings.isPrerunning = isPrerun;
      tradeSettings.isPrerunningVWAPSlope = isPrerunVWAPSlope;
      tradeSettings.isMocked = tradeSettings.isMocked || isPrerun || isPrerunVWAPSlope;
      LogData(tradeSettings, `Trading for ${tradeSettings.userName} @ ${nowNYText} (NY) with ${JSON.stringify(tradeSettings)}`);
      // Place the opening trade and monitor it to later close it out.
      const chains = await GetATMOptionChains(tradeSettings);
      // The trade orders are assigned to the tradeSettings object.
      const ordersReady = CreateOpenAndCloseOrders(chains, tradeSettings);
      if (ordersReady) {
        await PlaceOpeningOrderAndMonitorToClose(tradeSettings);
      } else {
        const msg = `Failed CreateOpenAndCloseOrders call. No orders were created for ${tradeSettings.userName} @ ${nowNYText} (NY) with ${JSON.stringify(tradeSettings)}`;
        LogData(tradeSettings, msg);
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

const usersTimeoutHandles = {};
const usersTimeoutHandlesSemaphore = Semaphore(1);

function prepareUserForScheduling(user) {
  if (usersTimeoutHandles[user._id]?.length > 0) {
    usersTimeoutHandles[user._id].forEach(item => Meteor.clearTimeout(item));
  }
  usersTimeoutHandles[user._id] = [];
}

function scheduleUsersTrade(tradeSettings, user) {
  try {
    const desiredTradeTime: dayjs.Dayjs = GetNewYorkTimeAt(tradeSettings.entryHour, tradeSettings.entryMinute);
    let delayInMilliseconds = dayjs.duration(desiredTradeTime.diff(dayjs())).asMilliseconds();
    if (delayInMilliseconds > 0 && tradeSettings.isActive) {
      const timeoutHandle = Meteor.setTimeout(async function timerMethodToOpenTrade() {
        Meteor.clearTimeout(timeoutHandle);
        await ExecuteTrade(tradeSettings, false, tradeSettings.isPrerun, tradeSettings.isPrerunVWAPSlope)
          .catch((reason) => {
            LogData(tradeSettings, `Failed to ExecuteTrade ${user.username}. Reason: ${reason}`);
          });
      }, delayInMilliseconds);
      usersTimeoutHandles[user._id].push(timeoutHandle);
    }
  } catch (ex) {
    LogData(tradeSettings, `Failed to schedule opening trade ${user.username}.`);
  }
}

async function QueueUsersTradesForTheDay(user) {
  const isMarketOpened = await IsOptionMarketOpenToday(user._id);
  if (!isMarketOpened) {
    LogData(null, `Queueing ${user.username}'s trades but market is closed today`);
    return;
  }
  LogData(null, `Market is open today so queueing ${user.username}'s trades.`);
  const userSettings: IUserSettings = UserSettings.findOne(user._id) ?? {};
  const {accountNumber, accountIsActive} = userSettings;
  if (!accountNumber || accountNumber === 'None') {
    LogData(null, `User ${user.username} has no account number so skipping this user.`, null);
    return;
  }
  if (!accountIsActive) {
    LogData(null, `User ${user.username} has an inactive account so skipping this user.`, null);
    return;
  }
  // 'async' is required for '.take' to bind Fiber to the function Meteor code to work inside Semaphore code.
  // If 'async' is removed, then LogData cannot be called inside Semaphore code.
  usersTimeoutHandlesSemaphore.take(async () => {
    try {
      prepareUserForScheduling(user);
      const tradeSettingsSet = TradeSettings.find({userId: user._id}).fetch();
      tradeSettingsSet.forEach((tradeSettings: ITradeSettings) => {
        tradeSettings.accountNumber = accountNumber;
        tradeSettings.userName = user.username;
        scheduleUsersTrade(tradeSettings, user);
      });
      LogData(null, `Scheduled ${usersTimeoutHandles[user._id]?.length} trades for user ${user.username} today.`);
    } catch (ex) {
      LogData(null, `Failed to queue trades for user ${user.username}.`, ex);
    } finally {
      usersTimeoutHandlesSemaphore.leave();
    }
  });
}

function PerformTradeForAllUsers() {
  const users = Users.find().fetch();
  users.forEach(QueueUsersTradesForTheDay);
}

export {
  WaitForOrderCompleted,
  MonitorTradeToCloseItOut,
  GetNewYorkTime24HourNow,
  GetNewYorkTimeNowAsText,
  PerformTradeForAllUsers,
  ExecuteTrade,
  EmergencyCloseAllTrades,
  QueueUsersTradesForTheDay,
};