import ITradeSettings, {BadDefaultIPrice, IPrice} from './Interfaces/ITradeSettings';
import dayjs, {Dayjs} from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import _ from 'lodash';
import IPrerunSlopeValue from './Interfaces/IPrerunSlopeValue';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import weekday from 'dayjs/plugin/weekday';
import locale from 'dayjs/plugin/localeData';
import Constants from "./Constants.ts";
import {BuySell} from "./Interfaces/ILegSettings.ts";
import CalculateOptionsPricing from "./CalculateOptionsPricing.ts";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(weekday);
dayjs.extend(locale);


/**
 * Given an hour number 0-23 and minutes, this returns a dayjs object that is that time in New York times zone.
 * This assumes that any time zone differences from where the code is running and New York is in hours and single
 * digits at that.
 *
 * @param hourIn
 * @param minute
 * @returns {dayjs.Dayjs}
 */
function GetNewYorkTimeAt(hourIn: number, minute: number): dayjs.Dayjs {
  let hour = hourIn;
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

function GetNewYorkTimeAsText(date: Date) {
  return dayjs(date).tz('America/New_York').format('MM/DD/YY hh:mm:ss A');
}

function InTradeHours() {
  const now = dayjs();
  const open = GetNewYorkTimeAt(9, 15);
  const close = GetNewYorkTimeAt(16, 15);
  return now.isAfter(open) && now.isBefore(close);
}

function CalculateTotalFees(tradeSettings) {
  if (tradeSettings.totalFees) return tradeSettings.totalFees;
  const {commissionPerContract = 0, legs} = tradeSettings;
  tradeSettings.totalFees = 0;
  legs.forEach((leg) => {
    // Multiply by 2 because we are opening and closing the position.
    tradeSettings.totalFees += leg.quantity * commissionPerContract * 2;
  });
  return tradeSettings.totalFees;
}

function getLastPriceSampled(record: ITradeSettings) {
  if (record.monitoredPrices && record.monitoredPrices.length > 0) {
    return record.monitoredPrices[record.monitoredPrices.length - 1].price;
  }
  return Number.NaN;
}

function CleanupGainLossWhenFailedClosingTrade(record: ITradeSettings) {
  const badNumber = !_.isFinite(record.gainLoss);
  const isClosed = !!record.whyClosed;
  if (badNumber && isClosed) {
    // Recalculate gain if the closing transaction never filled (assumed). Use expected gainLimit instead.
    record.gainLoss = CalculateGain(record, getLastPriceSampled(record));
  }
}

function CalculateGain(tradeSettings, currentPrice) {
  const {openingPrice, whyClosed, gainLimit} = tradeSettings;
  // Logic to handle failed closing trade, leaving currentPrice as NaN.
  const isClosed = !!tradeSettings.whyClosed;
  if (!_.isFinite(currentPrice) && isClosed) {
    currentPrice = getLastPriceSampled(tradeSettings);
  }
  const multiplier = tradeSettings.isBacktesting ? 100 : 1;
  // Multiply by 100 below because we are working options.
  let possibleGain = (Math.abs(openingPrice) - currentPrice) * multiplier;
  if (openingPrice > 0) {
    // We are in a short position.
    possibleGain = (Math.abs(currentPrice) - openingPrice) * multiplier;
  }
  if (tradeSettings.isBacktesting && tradeSettings.backtestingData?.delta) {
    // Calculate potential gain/loss based on the DELTA of the option.
    possibleGain = possibleGain * tradeSettings.backtestingData.delta * tradeSettings.backtestingData.quantity;
  }
  return possibleGain;
}

function CalculateLimitsAndFees(tradeSettings: ITradeSettings) {
  const {
    percentGain,
    percentLoss,
  } = tradeSettings;
  let {openingPrice} = tradeSettings;

  tradeSettings.totalFees = CalculateTotalFees(tradeSettings);

  if (tradeSettings.useShortOnlyForLimits) {
    if (openingPrice > 0) {
      openingPrice = Math.abs(tradeSettings.openingShortOnlyPrice);
    } else {
      openingPrice = -Math.abs(tradeSettings.openingShortOnlyPrice);
    }
  }

  // Important to be aware that openingPrice is 1/100th the actual since these are options. So the
  // percentGain and percentLoss values (when used as dollar amounts) should be used as is.

  // If long entry, the openingPrice is positive (debit) and negative if short (credit).
  if (openingPrice > 0) {
    if (tradeSettings.percentGainIsDollar) {
      // percentGain is stored as a percentage (e.g. 0.05 = 5%) but as a dollar amount, it is used as is since openingPrice is 1/100th.
      tradeSettings.gainLimit = Math.abs(openingPrice + percentGain);
    } else {
      tradeSettings.gainLimit = Math.abs(openingPrice + openingPrice * percentGain);
    }
    if (tradeSettings.percentLossIsDollar) {
      // percentGain is stored as a percentage (e.g. 0.05 = 5%) but as a dollar amount, it is used as is since openingPrice is 1/100th.
      tradeSettings.lossLimit = Math.abs(openingPrice - percentLoss);
    } else {
      tradeSettings.lossLimit = Math.abs(openingPrice - openingPrice * percentLoss);
    }
  } else {
    if (tradeSettings.percentGainIsDollar) {
      // percentGain is stored as a percentage (e.g. 0.05 = 5%) but as a dollar amount, it is used as is since openingPrice is 1/100th.
      tradeSettings.gainLimit = Math.abs(openingPrice + percentGain);
    } else {
      tradeSettings.gainLimit = Math.abs(openingPrice - openingPrice * percentGain);
    }
    if (tradeSettings.percentLossIsDollar) {
      // percentGain is stored as a percentage (e.g. 0.05 = 5%) but as a dollar amount, it is used as is since openingPrice is 1/100th.
      tradeSettings.lossLimit = Math.abs(openingPrice - percentLoss);
    } else {
      tradeSettings.lossLimit = Math.abs(openingPrice + openingPrice * percentLoss);
    }
  }
}

function CalculateUnderlyingPriceAverageSlope(samples: number, monitoredPrices: IPrice[]) {
  let underlyingSlope = 0;
  if (monitoredPrices?.length > samples * 2) {
    const average = (array: IPrice[]) => array.reduce((a, b) => a + b.underlyingPrice, 0) / array.length;
    let start = monitoredPrices.length - (samples * 2) - 1;
    let end = monitoredPrices.length - samples - 1;
    const average1 = average(monitoredPrices.slice(start, end));
    start = monitoredPrices.length - samples - 1;
    end = monitoredPrices.length - 1;
    const average2 = average(monitoredPrices.slice(start, end));
    underlyingSlope = (average2 - average1); // (y2-y1/x2-x1)
  }
  return underlyingSlope;
}

function CalculateUnderlyingPriceSlopeAngle(prerunSlopeValue: IPrerunSlopeValue, monitoredPrices: IPrice[]) {
  if (prerunSlopeValue) {
    const {totalSamples, samplesToAverage} = prerunSlopeValue;
    if (monitoredPrices.length > totalSamples && samplesToAverage < totalSamples) {
      const start = monitoredPrices.length - totalSamples;
      const average = (array: IPrice[]) => array.reduce((a, b) => a + b.underlyingPrice, 0) / array.length;
      const average1 = average(monitoredPrices.slice(start, start + samplesToAverage));
      const start2 = monitoredPrices.length - samplesToAverage;
      const average2 = average(monitoredPrices.slice(start2));
      const slope = (average2 - average1); // (y2-y1/x2-x1)
      const angle = Math.abs(Math.atan(slope) * 180 / Math.PI);
      monitoredPrices[monitoredPrices.length - 1].underlyingSlopeAngle = angle;
      return angle;
    }
  }
}

function SetEndOfDay(date: Dayjs) {
  return date.set('hour', 23).set('minute', 59).set('second', 59);
}

function SetStartOfDay(date: Dayjs) {
  return date.set('hour', 0).set('minute', 0).set('second', 0);
}

function CalculateTradePrice(tradeSettings: ITradeSettings, quotes) {
  let countFoundQuotes = 0; // must end up equal to the legs.length.
  // Now scan the quotes and add/subtract up the price.
  let result: IPrice = {...BadDefaultIPrice, price: 0, whenNY: new Date()};
  quotes.forEach((quote) => {
    const leg = tradeSettings.legs.find((leg) => leg.option.symbol===quote.symbol);
    // if leg not found, then something is wrong.
    if (!leg) {
      const msg = `GetPriceForOptions: leg not found for quote symbol: ${quote.symbol}`;
      throw new Error(msg);
    }
    // The quotes include the underlying stock price.
    result.underlyingPrice = quote.underlyingPrice;
    let price = 0;
    // We have tried using the mark price or the bidPrice/askPrice this IF statement
    // is used to keep both chunks of code logic, so we can easily switch back and forth.
    if (Constants.usingMarkPrice) {
      price = quote.mark;
    } else {
      // Base price on the lower value relative to the opposite desired entry buySell direction.
      // This is because entry is simply a time point while exit is based on value and the legs
      // define the buySell direction based on trade entry. So, do the opposite for exit.
      price = quote.bidPrice;
      if (leg.buySell===BuySell.SELL) {
        // Means we are buying this leg now to exit the trade.
        price = quote.askPrice;
      }
    }
    result = CalculateOptionsPricing(result, leg, price);
    countFoundQuotes++;
  });
  if (countFoundQuotes!==tradeSettings.legs.length) {
    const msg = `CalculateTradePrice: countFoundQuotes: ${countFoundQuotes} !== tradeSettings.legs.length: ${tradeSettings.legs.length}`;
    console.error(msg);
    return {...BadDefaultIPrice};
  }
  return result;
}

function AnyPrerunningOn(tradeSettings: ITradeSettings) {
  const {isPrerunning, isPrerunningVWAPSlope, isPrerunningVIXSlope, isPrerunningGainLimit} = tradeSettings;
  return isPrerunning || isPrerunningVWAPSlope || isPrerunningVIXSlope || isPrerunningGainLimit;
}

export {
  CalculateGain,
  CalculateTotalFees,
  CalculateLimitsAndFees,
  CalculateUnderlyingPriceAverageSlope,
  GetNewYorkTimeAsText,
  GetNewYorkTimeAt,
  CleanupGainLossWhenFailedClosingTrade,
  CalculateUnderlyingPriceSlopeAngle,
  InTradeHours,
  SetEndOfDay,
  SetStartOfDay,
  CalculateTradePrice,
  AnyPrerunningOn,
};