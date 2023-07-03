import ITradeSettings, {IPrice, whyClosedEnum} from './Interfaces/ITradeSettings';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import _ from 'lodash';

dayjs.extend(utc);
dayjs.extend(timezone);

function GetNewYorkTimeAsText(date: Date) {
  return dayjs(date).tz('America/New_York').format('MM/DD/YY hh:mm:ss A');
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

function CleanupGainLossWhenFailedClosingTrade(record: ITradeSettings) {
  const badNumber = !_.isFinite(record.gainLoss);
  if (badNumber && record.whyClosed === whyClosedEnum.gainLimit) {
    // Recalculate gain if the closing transaction never filled (assumed). Use expected gainLimit instead.
    record.gainLoss = CalculateGain(record, record.gainLimit);
  }
}

function CalculateGain(tradeSettings, currentPrice) {
  const {openingPrice, whyClosed, gainLimit} = tradeSettings;
  // Logic to handle failed closing trade, leaving currentPrice as NaN.
  if (!_.isFinite(currentPrice) && whyClosed === whyClosedEnum.gainLimit) {
    currentPrice = gainLimit;
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
      tradeSettings.gainLimit = Math.abs(tradeSettings.openingPrice + (percentGain * 100));
    } else {
      tradeSettings.gainLimit = Math.abs(tradeSettings.openingPrice + openingPrice * percentGain);
    }
    if (tradeSettings.percentLossIsDollar) {
      tradeSettings.lossLimit = Math.abs(tradeSettings.openingPrice - (percentLoss * 100));
    } else {
      tradeSettings.lossLimit = Math.abs(tradeSettings.openingPrice - openingPrice * percentLoss);
    }
  } else {
    if (tradeSettings.percentGainIsDollar) {
      tradeSettings.gainLimit = Math.abs(tradeSettings.openingPrice - (percentGain * 100));
    } else {
      tradeSettings.gainLimit = Math.abs(tradeSettings.openingPrice - openingPrice * percentGain);
    }
    if (tradeSettings.percentLossIsDollar) {
      tradeSettings.lossLimit = Math.abs(tradeSettings.openingPrice + (percentLoss * 100));
    } else {
      tradeSettings.lossLimit = Math.abs(tradeSettings.openingPrice + openingPrice * percentLoss);
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

export {
  CalculateGain,
  CalculateTotalFees,
  CalculateLimitsAndFees,
  CalculateUnderlyingPriceAverageSlope,
  GetNewYorkTimeAsText,
  CleanupGainLossWhenFailedClosingTrade
};