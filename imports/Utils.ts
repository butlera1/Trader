import ITradeSettings, {IPrice} from './Interfaces/ITradeSettings';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import _ from 'lodash';
import IPrerunSlopeValue from './Interfaces/IPrerunSlopeValue';
// @ts-ignore
import {GetNewYorkTimeAt} from '../server/Trader.ts';

dayjs.extend(utc);
dayjs.extend(timezone);

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
  let possibleGain = (Math.abs(openingPrice) - currentPrice) * 100.0;
  if (openingPrice > 0) {
    // We are in a long position.
    possibleGain = (Math.abs(currentPrice) - openingPrice) * 100.0;
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

  // If long entry, the openingPrice is positive (debit) and negative if short (credit).
  if (openingPrice > 0) {
    if (tradeSettings.percentGainIsDollar) {
      // percentGain is stored as a percentage (e.g. 0.05 = 5%) but when used as a dollar amount, it is multiplied by 100.
      tradeSettings.gainLimit = Math.abs(openingPrice + (percentGain * 100));
    } else {
      tradeSettings.gainLimit = Math.abs(openingPrice + openingPrice * percentGain);
    }
    if (tradeSettings.percentLossIsDollar) {
      // percentGain is stored as a percentage (e.g. 0.05 = 5%) but when used as a dollar amount, it is multiplied by 100.
      tradeSettings.lossLimit = Math.abs(openingPrice - (percentLoss * 100));
    } else {
      tradeSettings.lossLimit = Math.abs(openingPrice - openingPrice * percentLoss);
    }
  } else {
    if (tradeSettings.percentGainIsDollar) {
      // percentGain is stored as a percentage (e.g. 0.05 = 5%) but when used as a dollar amount, it is multiplied by 100.
      tradeSettings.gainLimit = Math.abs(openingPrice + (percentGain * 100));
    } else {
      tradeSettings.gainLimit = Math.abs(openingPrice - openingPrice * percentGain);
    }
    if (tradeSettings.percentLossIsDollar) {
      // percentGain is stored as a percentage (e.g. 0.05 = 5%) but when used as a dollar amount, it is multiplied by 100.
      tradeSettings.lossLimit = Math.abs(openingPrice - (percentLoss * 100));
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
};