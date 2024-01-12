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
  GetDescription,
  IPrice,
  whyClosedEnum
} from '../imports/Interfaces/ITradeSettings';
import {TradeSettings} from './collections/TradeSettings';
import {UserSettings} from './collections/UserSettings';
import {
  IsDailyGainOrLossLimitReached,
  SaveTradeToDailySummaryAndIsEmergencyClose
} from './collections/DailyTradeSummaries';
import {Random} from 'meteor/random';
import _ from 'lodash';
import {LogData} from './collections/Logs';
import {SendTextToAdmin} from './SendOutInfo';
import PollingMutex from './PollingMutex';
import {CalculateGain, CalculateLimitsAndFees, GetNewYorkTimeAt} from '../imports/Utils';
import Semaphore from 'semaphore';
import IUserSettings from '../imports/Interfaces/IUserSettings';
import {GetTradePriceViaBackgroundPolling, GetVIXMark, GetVIXSlope, GetVIXSlopeAngle} from "./BackgroundPolling";
import {DirectionUp} from '../imports/Interfaces/IPrerunVIXSlopeValue';
import {DefaultClosedTradeInfo, IClosedTradeInfo} from '../imports/Interfaces/IClosedTradeInfo';
import {TradeSettingsSets} from "./collections/TradeSettingsSets";
import ITradeSettingsSet, {DefaultTradeSettingsSets} from "../imports/Interfaces/ITradeSettingsSet";

dayjs.extend(duration);
dayjs.extend(isoWeek);

export const isoWeekdayNames = ['skip', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const oneSeconds = 1000;

function GetNewYorkTimeNowAsText() {
  const currentLocalTime = new Date();
  return currentLocalTime.toLocaleString('en-US', {timeZone: 'America/New_York'});
}

function GetNewYorkTime24HourNow() {
  const text = GetNewYorkTimeNowAsText();
  const parts = text.split(' ');
  const hour = parseInt(parts[1].split(':')[0], 10);
  const additionalHours = (parts[2]==='PM' && hour!==12) ? 12:0;
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
      Meteor.setTimeout(() => {
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

async function CloseTrade(tradeSettings: ITradeSettings, currentPrice: IPrice): Promise<IClosedTradeInfo> {
  const {isMocked, userId, accountNumber, closingOrder, openingPrice, isBacktesting} = tradeSettings;
  const result: IClosedTradeInfo = {...DefaultClosedTradeInfo, isClosed: true};
  if (isMocked || isBacktesting) {
    tradeSettings.closingOrderId = Random.id();
    tradeSettings.closingPrice = currentPrice.price;
  } else {
    tradeSettings.closingOrderId = await PlaceOrder(userId, accountNumber, closingOrder).catch(reason => {
      const msg = `CloseTrade ERROR. FAILED to close a trade!!! ${reason.toString()}`;
      LogData(tradeSettings, msg, reason);
      SendTextToAdmin(msg, msg);
      return result;
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
  tradeSettings.whenClosed = currentPrice.whenNY;
  tradeSettings.gainLoss = CalculateGain(tradeSettings, tradeSettings.closingPrice);
  if (!isBacktesting) {
    Trades.update(tradeSettings._id, {
      $set: {
        closingOrderId: tradeSettings.closingOrderId,
        closingPrice: tradeSettings.closingPrice,
        whyClosed: tradeSettings.whyClosed,
        whenClosed: tradeSettings.whenClosed,
        gainLoss: tradeSettings.gainLoss,
      }
    });
    const message = `${tradeSettings.userName}: Trade closed (${tradeSettings.whyClosed}): Entry: $${openingPrice.toFixed(2)}, ` +
      `Exit: $${tradeSettings.closingPrice?.toFixed(2)}, ` +
      `G/L $${tradeSettings.gainLoss?.toFixed(2)} at ${tradeSettings.whenClosed} NY, _ID: ${tradeSettings._id}`;
    LogData(tradeSettings, message);
  }
  const isEmergencyClose = SaveTradeToDailySummaryAndIsEmergencyClose(tradeSettings, currentPrice.whenNY);
  if (isEmergencyClose && !isBacktesting) {
    EmergencyCloseAllTradesForUser(userId);
  }
  const wasPrerunning = tradeSettings.isPrerunning;
  const wasPrerunningVIXSlope = tradeSettings.isPrerunningVIXSlope;
  const wasPrerunningGainLimit = tradeSettings.isPrerunningGainLimit;

  // See if we should repeat the trade now that it is closed.
  let notTooLate = true;
  if (tradeSettings.isRepeat) {
    notTooLate = (GetNewYorkTime24HourNow() < (tradeSettings.repeatStopHour ?? 16));
  }
  const okToRepeat = (tradeSettings.whyClosed!==whyClosedEnum.emergencyExit) &&
    (tradeSettings.whyClosed!==whyClosedEnum.timedExit) &&
    (notTooLate);
  if ((tradeSettings.isRepeat || wasPrerunning || wasPrerunningVIXSlope || wasPrerunningGainLimit) && okToRepeat) {
    let nowPrerunning = wasPrerunning ? false:tradeSettings.isPrerun;
    // If wasPrerunning, and we exited for something other than (gainLimit or prerunExit), restart a prerun.
    if (wasPrerunning && tradeSettings.whyClosed!==whyClosedEnum.gainLimit && tradeSettings.whyClosed!==whyClosedEnum.prerunExit) {
      nowPrerunning = true; // Do another prerun because we exited for loss limit or similar.
    }

    let nowPrerunningVIXSlope = wasPrerunningVIXSlope ? false:tradeSettings.isPrerunVIXSlope;
    // If wasPrerunningVIXSlope and we exited for something other than (gainLimit or prerunSlopeExit), restart a prerun.
    if (wasPrerunningVIXSlope && tradeSettings.whyClosed!==whyClosedEnum.gainLimit && tradeSettings.whyClosed!==whyClosedEnum.prerunVIXSlopeExit) {
      nowPrerunningVIXSlope = true; // Do another prerunSlope because we exited for loss limit or similar.
    }
    if (tradeSettings.isPrerunVIXSlope && tradeSettings.gainLoss > 0) {
      // If the setting is enabled and we just had a gain, don't go back to prerunSlope again.
      nowPrerunningVIXSlope = false;
    }

    // Decide what to do about isPrerunGainLimit. Always rerun PrerunGainLimit if we did not hit prerunGainLimitExit.
    let nowPrerunningGainLimit = tradeSettings.isPrerunGainLimit;
    if (wasPrerunningGainLimit && (tradeSettings.whyClosed===whyClosedEnum.prerunGainLimitExit)) {
      // Do a real trade is we were in prerunGainLimit and we just exited for prerunGainLimitExit.
      nowPrerunningGainLimit = false;
    }
    if (tradeSettings.isPrerunGainLimit && !wasPrerunningGainLimit && tradeSettings.gainLoss > 0) {
      // If PrerunGainLimit is enabled and we just had a gain on real trade, do another real trade.
      nowPrerunningGainLimit = false;
    }
    return {isClosed: true, isRepeat: true, nowPrerunning, nowPrerunningVIXSlope, nowPrerunningGainLimit};
  }
  return result;
}

async function forceCloseATrade(tradeSettings: ITradeSettings) {
  // Get the last recorded price for this trade and use it for the exit price if in mocked mode.
  // Note the closingPrice defaults to the NEGATIVE of the openingPrice.
  let exitPrice: IPrice = {...DefaultIPrice, price: -tradeSettings.openingPrice, whenNY: new Date()};
  if (tradeSettings.monitoredPrices?.length > 0) {
    exitPrice = tradeSettings.monitoredPrices[tradeSettings.monitoredPrices.length - 1];
  }
  tradeSettings.whyClosed = whyClosedEnum.emergencyExit;
  await CloseTrade(tradeSettings, exitPrice).catch(reason => {
    LogData(tradeSettings, reason.toString(), reason);
  });
}


function EmergencyCloseAllTradesForUser(userId: string) {
  let result = '';
  try {
    // Find all live trades for this user.
    const liveTrades = Trades.find({userId: userId, whyClosed: {$exists: false}}).fetch();
    result = `Found ${liveTrades.label} trades.`;
    liveTrades.forEach(forceCloseATrade);
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

function EmergencyCloseSingleTrade(_id: string) {
  try {
    if (!Meteor.userId()) {
      throw new Meteor.Error('EmergencyCloseSingleTrade: Must have valid user.');
    } else {
      const liveTrade = Trades.findOne({_id, whyClosed: {$exists: false}});
      if (liveTrade) {
        forceCloseATrade(liveTrade).then().catch(reason => {
          throw new Meteor.Error(`EmergencyCloseSingleTrade: Closing ${_id} failed with ${reason}}`);
        });
      }
      return `Closed trade ${_id}.`;
    }
  } catch (ex) {
    throw new Meteor.Error(`EmergencyCloseSingleTrade: Closing ${_id} failed with ${ex}}`);
  }
}

function getTradeDurationInMinutes(tradeSettings: ITradeSettings) {
  const initialTime = tradeSettings.monitoredPrices[0] ? dayjs(tradeSettings.monitoredPrices[0].whenNY):dayjs();
  const latestTime = tradeSettings.monitoredPrices[tradeSettings.monitoredPrices.length - 1] ? dayjs(tradeSettings.monitoredPrices[tradeSettings.monitoredPrices.length - 1].whenNY):dayjs();
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
  if (liveTrade.monitoredPrices.length===0) return 0;
  const maxGain = liveTrade.monitoredPrices.reduce((max, sample) => sample.gain > max.gain ? sample:max, liveTrade.monitoredPrices[0]);
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
    const underlyingMovement = getUnderlyingMovement(liveTrade.monitoredPrices[0], currentSample);
    return (desiredMinutes <= durationInMinutes && underlyingMovement >= desiredMovement);
  }
  return false;
}

function checkRule6Exit(liveTrade: ITradeSettings, currentSample: IPrice) {
  if (liveTrade.isRule6) {
    const desiredMinutes = liveTrade.rule6Value?.minutes ?? 0;
    const desiredMovement = -Math.abs(liveTrade.rule6Value?.underlyingPercentOfCredit * liveTrade.openingPrice ?? 0);
    const durationInMinutes = getTradeDurationInMinutes(liveTrade);
    const underlyingMovement = getUnderlyingMovement(liveTrade.monitoredPrices[0], currentSample);
    return (desiredMinutes <= durationInMinutes && underlyingMovement <= desiredMovement);
  }
  return false;
}

function checkRule7Exit(liveTrade: ITradeSettings, currentSample: IPrice) {
  if (liveTrade.isRule7) {
    if (liveTrade.monitoredPrices.length > liveTrade.rule7Value?.samples) {
      const samples = liveTrade.rule7Value?.samples ?? 0;
      const percent = liveTrade.rule7Value?.percent ?? 1;
      const averageGain = getAveragePrice(liveTrade.monitoredPrices, samples);
      const index = liveTrade.monitoredPrices.length - samples - 1;
      const previousGain = liveTrade.monitoredPrices[index].gain;
      const desiredDrop = percent * liveTrade.lossLimit;
      return (averageGain - previousGain) <= desiredDrop;
    }
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
    }
  }
  return false;
}

function checkPrerunVIXSlopeExit(liveTrade: ITradeSettings) {
  if (liveTrade.isPrerunningVIXSlope) {
    const numberOfDesiredVIXAnglesInARow = liveTrade.prerunVIXSlopeValue.numberOfDesiredVIXAnglesInARow ?? 4;
    if (liveTrade.monitoredPrices.length >= numberOfDesiredVIXAnglesInARow) {
      // This approach is for checking for VIX slope trending down (decreasing in value) or up.
      const samples = liveTrade.monitoredPrices.slice(liveTrade.monitoredPrices.length - numberOfDesiredVIXAnglesInARow);
      const isUp = liveTrade.prerunVIXSlopeValue.direction===DirectionUp;
      let trending = true;
      for (let i = 0; i < samples.length - 1; i++) {
        if (isUp) {
          trending = trending && samples[i].vixSlopeAngle <= samples[i + 1].vixSlopeAngle && samples[i + 1].vixSlopeAngle >= 0;
        } else {
          trending = trending && samples[i].vixSlopeAngle >= samples[i + 1].vixSlopeAngle && samples[i + 1].vixSlopeAngle <= 0;
        }
      }
      return trending;
    }
  }
  return false;
}

function checkPrerunGainLimitExit(liveTrade: ITradeSettings, isGainLimitMet: boolean) {
  if (liveTrade.isPrerunningGainLimit) {
    const tradeDurationInSeconds = getTradeDurationInMinutes(liveTrade) * 60;
    const isSpeedMet = tradeDurationInSeconds <= liveTrade.prerunGainLimitValue.seconds;
    return isSpeedMet && isGainLimitMet;
  }
  return false;
}

function getAveragePrice(samples: IPrice[], desiredNumberOfSamples: number) {
  const numberOfSamples = Math.min(desiredNumberOfSamples, samples.length);
  if (numberOfSamples===0) return 0;
  // Get the last numberOfSamples samples.
  const subSet = samples.slice(samples.length - numberOfSamples);
  const sum = subSet.reduce((sum, sample) => sum + sample.price, 0);
  return sum / numberOfSamples;
}

function calculateVariousValues(liveTrade: ITradeSettings, currentSample: IPrice) {
  currentSample.gain = CalculateGain(liveTrade, currentSample.price);
  liveTrade.gainLoss = currentSample.gain;
  currentSample.vixMark = GetVIXMark();
  currentSample.vixSlopeAngle = GetVIXSlopeAngle();
  currentSample.vixSlope = GetVIXSlope();
  if (!liveTrade.isBacktesting) {
    // Record price value for historical reference and charting.
    Trades.update(liveTrade._id, {$addToSet: {monitoredPrices: currentSample}});
  }
}

function isExitTimeBeforeSampleTime(currentSamplePrice :IPrice, liveTrade: ITradeSettings) {
  const currentSampleTime = dayjs(currentSamplePrice.whenNY);
  let exitTime = GetNewYorkTimeAt(liveTrade.exitHour, liveTrade.exitMinute);
  if (liveTrade.isMultiDay) {
    const daysInTrade = dayjs(currentSamplePrice.whenNY).diff(dayjs(liveTrade.whenOpened), 'day');
    if (daysInTrade >= liveTrade.exitDaysFromOpen) {
      exitTime = dayjs(currentSamplePrice.whenNY).subtract(1, 'hour'); // Force trade close.
    } else {
      exitTime = dayjs(currentSamplePrice.whenNY).add(1, 'hour'); // Still not time to close the trade.
    }
  }
  // With back testing we can have different dates for the current sample so compare only the hours and minutes.
  if (exitTime.hour() < currentSampleTime.hour()) {
    return true;
  }
  if (exitTime.hour()===currentSampleTime.hour() && exitTime.minute() <= currentSampleTime.minute()) {
    return true;
  }
  if (liveTrade.isBacktesting && liveTrade.backtestingData.index >= liveTrade.backtestingData.minuteData.length) {
    // Close if we reached the end of the backtesting data for the day.
    return true;
  }
  return false;
}

async function CheckForTradeCompletion(liveTrade: ITradeSettings, currentSamplePrice: IPrice): Promise<IClosedTradeInfo> {
  calculateVariousValues(liveTrade, currentSamplePrice);
  const isEndOfDay = isExitTimeBeforeSampleTime(currentSamplePrice, liveTrade);
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
  const isRule6Exit = checkRule6Exit(liveTrade, currentSamplePrice);
  const isRule7Exit = checkRule7Exit(liveTrade, currentSamplePrice);
  const isPrerunExit = checkPrerunExit(liveTrade);
  const isPrerunVIXSlopeExit = checkPrerunVIXSlopeExit(liveTrade);
  const isPrerunGainLimitExit = checkPrerunGainLimitExit(liveTrade, isGainLimit);

  const weHaveAnExitReason = isGainLimit || isLossLimit || isEndOfDay || isRule1Exit ||
    isRule2Exit || isRule3Exit || isRule4Exit || isRule5Exit || isPrerunExit || isPrerunVIXSlopeExit || isPrerunGainLimitExit;

  if (weHaveAnExitReason) {
    if (isGainLimit) {
      liveTrade.whyClosed = whyClosedEnum.gainLimit;
    }
    if (isLossLimit) {
      liveTrade.whyClosed = whyClosedEnum.lossLimit;
    }
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
    if (isRule6Exit) {
      liveTrade.whyClosed = whyClosedEnum.rule6Exit;
    }
    if (isRule7Exit) {
      liveTrade.whyClosed = whyClosedEnum.rule7Exit;
    }
    if (isPrerunExit) {
      liveTrade.whyClosed = whyClosedEnum.prerunExit;
    }
    if (isPrerunVIXSlopeExit) {
      liveTrade.whyClosed = whyClosedEnum.prerunVIXSlopeExit;
    }
    if (isPrerunGainLimitExit) {
      liveTrade.whyClosed = whyClosedEnum.prerunGainLimitExit;
    }
    if (isEndOfDay) {
      liveTrade.whyClosed = whyClosedEnum.timedExit;
    }
    const closedTradeInfo: IClosedTradeInfo = await CloseTrade(liveTrade, currentSamplePrice).catch(reason => {
      const msg = `Exception with MonitorTradeToCloseItOut waiting CloseTrade: ${reason}.`;
      LogData(liveTrade, msg, new Meteor.Error(reason, msg));
      return {...DefaultClosedTradeInfo, isClosed: true, isRepeat: false};
    });
    return closedTradeInfo;
  }
  return {...DefaultClosedTradeInfo, isClosed: false, isRepeat: false};
}

async function MonitorTradeToCloseIt(liveTrade: ITradeSettings) {
  try {
    // The latestActiveTradeRecord can be updated via an 'Emergency Exit' call so check it along with the liveTrade.
    const latestActiveTradeRecord = Trades.findOne(liveTrade._id) ?? {};
    const isClosedAlready = !!(latestActiveTradeRecord.whyClosed || liveTrade.whyClosed);
    if (isClosedAlready) {
      // trade has been completed already (probably emergency exit) so exit.
      return;
    }
    // Get the current price for the trade.
    const currentSamplePrice: IPrice = GetTradePriceViaBackgroundPolling(liveTrade);
    if (currentSamplePrice.price===Number.NaN || currentSamplePrice.price===0) {
      return; // Try again on next interval timeout.
    }
    liveTrade.monitoredPrices.push(currentSamplePrice);

    const closedInfo: IClosedTradeInfo = await CheckForTradeCompletion(liveTrade, currentSamplePrice);
    if (closedInfo.isClosed) {
      if (closedInfo.isRepeat) {
        // Start another trade if IsRepeat.
        const {nowPrerunning, nowPrerunningVIXSlope, nowPrerunningGainLimit} = closedInfo;
        // Get fresh copy of the settings without values for whyClosed, openingPrice, closingPrice, gainLoss, etc.
        const settings = TradeSettings.findOne(liveTrade.originalTradeSettingsId);
        ExecuteTrade(settings, false, nowPrerunning, nowPrerunningVIXSlope, nowPrerunningGainLimit)
          .catch((reason) => LogData(settings, `Failed doing a repeat ExecuteTrade ${reason}`, new Error(reason)));
      }
    }
  } catch (ex) {
    // We have an emergency if this happens, so send communications.
    const message = `Trader has an exception in MonitorTradeToCloseItOut.`;
    LogData(liveTrade, message, ex);
  }
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
  let isFilled = (order?.status==='FILLED');
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
        if (order.status==='REJECTED' || order.status==='CANCELED') {
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

function CalculateLimitsAndFeesWhenBackTesting(tradeSettings: ITradeSettings) {
  const {percentGain, percentLoss} = tradeSettings;
  tradeSettings.percentGain = tradeSettings.percentGain / tradeSettings.backtestingData.delta;
  tradeSettings.percentLoss = tradeSettings.percentLoss / tradeSettings.backtestingData.delta;
  CalculateLimitsAndFees(tradeSettings);
  tradeSettings.percentGain = percentGain;
  tradeSettings.percentLoss = percentLoss;
}

function PrepareTradeForStartOfTrade(tradeSettings: ITradeSettings) {
  tradeSettings.originalTradeSettingsId = tradeSettings._id;
  tradeSettings.monitoredPrices = [];
  if (tradeSettings.isBacktesting) {
    CalculateLimitsAndFeesWhenBackTesting(tradeSettings);
  } else {
    CalculateLimitsAndFees(tradeSettings);
  }
  let currentSample: IPrice = {
    ...DefaultIPrice,
    price: -tradeSettings.openingPrice, // Negative for calculateVariousValues below and monitoredPrices array.
    whenNY: tradeSettings.whenOpened,
    underlyingPrice: tradeSettings.openingUnderlyingPrice,
  };
  calculateVariousValues(tradeSettings, currentSample);
  tradeSettings.monitoredPrices.push(currentSample);
}

async function PlaceOpeningOrderAndMonitorToClose(tradeSettings: ITradeSettings) {
  tradeSettings.openingOrderId = Random.id() + '_faked'; // Fake an order id for backtesting or mocked mode.
  if (!tradeSettings.isMocked) {
    tradeSettings.openingOrderId = await PlaceOrder(tradeSettings.userId, tradeSettings.accountNumber, tradeSettings.openingOrder);
    const priceResults = await WaitForOrderCompleted(tradeSettings.userId, tradeSettings.accountNumber, tradeSettings.openingOrderId)
      .catch(() => {
        return {orderPrice: 0, shortOnlyPrice: 0};
      });
    if (priceResults?.orderPrice) {
      tradeSettings.openingPrice = priceResults.orderPrice;
      tradeSettings.openingShortOnlyPrice = priceResults.shortOnlyPrice;
      tradeSettings.whenOpened = new Date(); // Live trade show use NOW for whenOpened.
    }
  }
  PrepareTradeForStartOfTrade(tradeSettings);
  delete tradeSettings._id; // Remove the old _id for so when storing into Trades collection, a new _id is created.
  tradeSettings._id = Trades.insert({...tradeSettings});
  if (!_.isFinite(tradeSettings.openingPrice)) {
    LogData(tradeSettings, `Error: Opening order for trade: ${tradeSettings._id}, ${tradeSettings.userName} has bad opening price.`, null);
    return;
  }
  // Background polling will see this trade and monitor it for close each polling cycle.
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

function IsTradeReadyToRun(
  tradeSettings: ITradeSettings,
  forceTheTrade: boolean = false,
  isPrerun: boolean = false,
  isPrerunVIXSlope: boolean = false,
  isPrerunGainLimit: boolean = false
): boolean {
  if (!tradeSettings) {
    const msg = `IsTradeReadyToRun called without 'tradeSettings'.`;
    LogData(null, msg, new Error(msg));
    return false;
  }
  const userSettings: IUserSettings = UserSettings.findOne({_id: tradeSettings.userId});
  if (!userSettings?.accountIsActive) {
    LogData(tradeSettings, `IsTradeReadyToRun called for ${tradeSettings.userName} but account is not active.`, null);
    return false;
  }
  if (userSettings?.isMaxGainAllowedMet) {
    LogData(tradeSettings, `IsTradeReadyToRun called for ${tradeSettings.userName} but Max Daily Gain has been met.`, null);
    return false;
  }
  let now = null;
  if (tradeSettings.isBacktesting) {
    if (!tradeSettings.backtestingData.minuteData[tradeSettings.backtestingData.index]) {
      console.error(`IsTradeReadyToRun: backtestingData.index ${tradeSettings.backtestingData.index} is out of range for array size ${tradeSettings.backtestingData.minuteData.length}`);
    }
    now = dayjs(tradeSettings.backtestingData.minuteData[tradeSettings.backtestingData.index].datetime);
    if (IsDailyGainOrLossLimitReached(tradeSettings, now)) {
      return false;
    }
  } else {
    now = dayjs();
  }
  // Make sure we have latest userSettings for this new trade about to happen.
  tradeSettings.accountNumber = userSettings.accountNumber;
  tradeSettings.phone = userSettings.phone;
  tradeSettings.emailAddress = userSettings.email;
  tradeSettings.isPrerunning = isPrerun;
  tradeSettings.isPrerunningVIXSlope = isPrerunVIXSlope;
  tradeSettings.isPrerunningGainLimit = isPrerunGainLimit;
  tradeSettings.isMocked = tradeSettings.isMocked || isPrerun || isPrerunVIXSlope || isPrerunGainLimit;
  tradeSettings.description = GetDescription(tradeSettings);
  tradeSettings.gainLoss = 0;
  delete tradeSettings.whyClosed;

  const nowNYText = now.toDate().toLocaleString('en-US', {timeZone: 'America/New_York'});
  const currentDayOfTheWeek = isoWeekdayNames[now.isoWeekday()];
  const justBeforeClose = GetNewYorkTimeAt(15, 55);
  const notTooLateToTrade = now.isBefore(justBeforeClose) || tradeSettings.isBacktesting;
  const tradePatternIncludesThisDayOfTheWeek = tradeSettings.days?.includes(currentDayOfTheWeek);
  const hasLegsInTrade = tradeSettings.legs.length > 0;
  let performTheTrade = (
    tradeSettings.isActive &&
    notTooLateToTrade &&
    tradePatternIncludesThisDayOfTheWeek &&
    hasLegsInTrade
  );
  performTheTrade = performTheTrade || forceTheTrade;
  if (!performTheTrade) {
    const msg = `Skipping a trade setting for ${tradeSettings.userName} @ ${nowNYText} (NY). \
Is Not Active: ${!tradeSettings.isActive}, Too Close To Closing Time: ${!notTooLateToTrade}, \
Not This Day Of The Week: ${!tradePatternIncludesThisDayOfTheWeek}, \
No Legs: ${!hasLegsInTrade} with ${JSON.stringify(tradeSettings)}`;
    LogData(tradeSettings, msg);
  }
  return performTheTrade;
}

async function ExecuteTrade(
  tradeSettings: ITradeSettings,
  forceTheTrade: boolean = false,
  isPrerun: boolean = false,
  isPrerunVIXSlope: boolean = false,
  isPrerunGainLimit: boolean = false
): Promise<IClosedTradeInfo> {
  const performTheTrade = IsTradeReadyToRun(tradeSettings, forceTheTrade, isPrerun, isPrerunVIXSlope, isPrerunGainLimit);
  if (performTheTrade) {
    try {
      // Place the opening trade and monitor it to later close it out.
      const chains = await GetATMOptionChains(tradeSettings);
      // The trade orders are assigned to the tradeSettings object.
      const ordersReady = CreateOpenAndCloseOrders(chains, tradeSettings);
      if (ordersReady) {
        await PlaceOpeningOrderAndMonitorToClose(tradeSettings);
      } else {
        const msg = `Failed CreateOpenAndCloseOrders call. No orders were created for ${tradeSettings.userName} @ ${dayjs()} (NY) with ${JSON.stringify(tradeSettings)}`;
        LogData(tradeSettings, msg);
      }
    } catch (ex) {
      const when = dayjs();
      const msg = `ExecuteTrade failed with user ${tradeSettings.userName} at ${when.format('MMM DD, YYYY hh:mm:ssa')}. Exception: ${ex}`;
      LogData(tradeSettings, msg, ex);
    }
  }
  return {...DefaultClosedTradeInfo, isClosed: true, isRepeat: false};
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
        await ExecuteTrade(tradeSettings, false, tradeSettings.isPrerun, tradeSettings.isPrerunVIXSlope, tradeSettings.isPrerunGainLimit)
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

function getUsersDefaultTradeSettings(userId: string): ITradeSettings[] {
  let tradeSet: ITradeSettingsSet = TradeSettingsSets.findOne({userId, isDefault: true});
  if (!tradeSet) {
    tradeSet = TradeSettingsSets.findOne({userId}) ?? {...DefaultTradeSettingsSets};
  }
  const tradeSettingsSet = TradeSettings.find({_id: {$in: tradeSet.tradeSettingIds}}).fetch();
  return tradeSettingsSet;
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
  if (!accountNumber || accountNumber==='None') {
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
      const tradeSettingsSet = getUsersDefaultTradeSettings(user._id);
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
  MonitorTradeToCloseIt,
  GetNewYorkTime24HourNow,
  GetNewYorkTimeNowAsText,
  PerformTradeForAllUsers,
  ExecuteTrade,
  EmergencyCloseAllTrades,
  EmergencyCloseSingleTrade,
  QueueUsersTradesForTheDay,
  IsTradeReadyToRun,
  PrepareTradeForStartOfTrade,
  CheckForTradeCompletion,
};