import ILegSettings, {BuySell, OptionType} from './ILegSettings';
import {IRule1Value} from '../ui/TradeSettings/Rules/Rule1';
import {IPrerunValue} from '../ui/TradeSettings/Rules/PrerunRule';
import IRule2Value from './IRule2Value';
import IRule3Value from './IRule3Value';
import IRule4Value from './IRule4Value';
import IRule5Value from './IRule5Value';
import IPrerunVWAPSlopeValue, {defaultPrerunVWAPSlopeValue} from './IPrerunVWAPSlopeValue';
import IPrerunVIXSlopeValue, {defaultPrerunVIXSlopeValue} from './IPrerunVIXSlopeValue';
import IRule6Value from './IRule6Value';
import IRule7Value from './IRule7Value';
import IPrerunGainAndTime, {defaultPrerunGainLimitValue} from './IPrerunGainLimitValue';
import ICandle from './ICandle';

enum whyClosedEnum {
  emergencyExit = 'emergencyExit',
  gainLimit = 'gainLimit',
  lossLimit = 'lossLimit',
  timedExit = 'timedExit',
  rule1Exit = 'r1Exit',
  rule2Exit = 'r2Exit',
  rule3Exit = 'r3Exit',
  rule4Exit = 'r4Exit',
  rule5Exit = 'r5Exit',
  rule6Exit = 'r6Exit',
  rule7Exit = 'r7Exit',
  prerunExit = 'prerunExit',
  prerunVWAPSlopeExit = 'prerunVWAPSlopeExit',
  prerunVIXSlopeExit = 'prerunVIXSlopeExit',
  prerunGainLimitExit = 'prerunGainLimitExit',
}

interface IPrice {
  price: number,
  whenNY?: Date,
  gain?: number,
  underlyingPrice?: number,
  shortStraddlePrice?: number,
  longStraddlePrice?: number,
  extrinsicShort?: number,
  extrinsicLong?: number,
  slope1?: number,
  slope2?: number,
  underlyingSlopeAngle?: number,
  vwap?: number,
  maxVWAPMark?: number,
  minVWAPMark?: number,
  vwapMark?: number,
  vwapSlopeAngle?: number,
  vixMark?: number,
  vixSlopeAngle?: number,
  vixSlope?: number,
}

const DefaultIPrice :IPrice = {
  price: 0,
  whenNY: new Date(),
  gain: 0,
  underlyingPrice: 0,
  shortStraddlePrice: 0,
  longStraddlePrice: 0,
  extrinsicShort: 0,
  extrinsicLong: 0,
  slope1: 0,
  slope2: 0,
  underlyingSlopeAngle: 0,
  vwap: 0,
  maxVWAPMark: 0,
  minVWAPMark: 0,
  vwapMark: 0,
  vwapSlopeAngle: 0,
};

const BadDefaultIPrice :IPrice = {
  price: Number.NaN,
  whenNY: undefined,
  gain: 0,
  underlyingPrice: 0,
  shortStraddlePrice: 0,
  longStraddlePrice: 0,
  extrinsicShort: 0,
  extrinsicLong: 0,
  slope1: 0,
  slope2: 0,
  underlyingSlopeAngle: 0,
};

interface IDailyResult {
  when: Date,
  trades: ITradeSettings[],
}

interface IBacktestSummary {
  startDate: Date,
  endDate: Date,
  entryHour: number,
  exitHour: number,
  gainLimit: number,
  lossLimit: number,
  prerunGainLimitValueSeconds: number,
  resultsPerDay: IDailyResult[],
  gainLossTotal: number,
  totalGain: number,
  totalLoss: number,
  wins: number,
  losses: number,
  winRate: number,
  lossRate: number,
  averageDurationMin: number,
  averageWinsDurationMin: number,
  averageLossesDurationMin: number,
  totalNumberOfTrades: number,
}

const DefaultIBacktestSummary: IBacktestSummary = {
  startDate: new Date(),
  endDate: new Date(),
  entryHour: 9,
  exitHour: 10,
  gainLimit: 1,
  lossLimit: 1,
  prerunGainLimitValueSeconds: 180,
  resultsPerDay: [],
  totalGain: 0,
  totalLoss: 0,
  wins: 0,
  losses: 0,
  averageDurationMin: 0,
  averageWinsDurationMin: 0,
  averageLossesDurationMin: 0,
  totalNumberOfTrades: 0,
};

interface IBacktestingData {
  index: number,
  minuteData: ICandle[],
  isHighUsed: boolean,
  isLowUsed: boolean,
  tradeType: OptionType,
  delta: number,
}

export const DefaultIBacktestingData = {
  minuteData: [],
  index: 0,
  isHighUsed: false,
  isLowUsed: false,
  results: [],
  tradeType: OptionType.CALL,
  delta: 0.50,
};

interface ITradeSettings {
  _id?: string,
  name?: string,
  userId?: string;
  accountNumber?: string;
  userName?: string;
  description?: string;
  isActive: boolean,
  isMocked: boolean,
  percentGain: number,
  percentGainIsDollar?: boolean,
  percentLossIsDollar?: boolean,
  percentLoss: number,
  entryHour: number,
  entryMinute: number,
  exitHour: number,
  exitMinute: number,
  commissionPerContract: number,
  symbol: string,
  days: string[],
  emailAddress?: string,
  phone?: string,
  tradeType?: string[];
  legs: ILegSettings[],
  openingOrder?: any,
  closingOrder?: any,
  whenOpened?: Date,
  whenClosed?: Date,
  whyClosed?: whyClosedEnum,
  gainLoss?: number,
  openingOrderId?: string,
  closingOrderId?: string,
  openingPrice?: number,
  openingShortOnlyPrice?: number,
  closingPrice?: number,
  csvSymbols?: string,
  underlyingPrice?: number,
  monitoredPrices?: IPrice[],
  gainLimit?: number,
  lossLimit?: number,
  isRepeat?: boolean,
  repeatStopHour?: number,
  originalTradeSettingsId?: string,
  useShortOnlyForLimits?: boolean,
  isRule1?: boolean,
  isRule2?: boolean,
  isRule3?: boolean,
  isRule4?: boolean,
  isRule5?: boolean,
  isRule6?: boolean,
  isRule7?: boolean,
  isPrerunGainLimit?: boolean,
  isPrerunningGainLimit?: boolean,
  prerunGainLimitValue?: IPrerunGainAndTime,
  isPrerun?: boolean,
  isPrerunning?: boolean,
  prerunValue?: IPrerunValue,
  isPrerunVWAPSlope?: boolean,
  isPrerunningVWAPSlope?: boolean,
  prerunVWAPSlopeValue?: IPrerunVWAPSlopeValue,
  isPrerunVIXSlope?: boolean,
  isPrerunningVIXSlope?: boolean,
  prerunVIXSlopeValue?: IPrerunVIXSlopeValue,
  rule1Value?: IRule1Value,
  rule2Value?: IRule2Value,
  rule3Value?: IRule3Value,
  rule4Value?: IRule4Value,
  rule5Value?: IRule5Value,
  rule6Value?: IRule6Value,
  rule7Value?: IRule7Value,
  totalFees?: number,
  slope1Samples?: number,
  slope2Samples?: number,
  isCopiedOpenPriceToClosePrice?: boolean,
  openingUnderlyingPrice?: number,
  showVixAndSlopeInGraphs?: boolean,
  isBacktesting?: boolean,
  backtestingData?: IBacktestingData,
}

const DefaultIronCondorLegsSettings = [
  {
    buySell: BuySell.SELL,
    callPut: OptionType.CALL,
    delta: 0.5,
    dte: 0,
    quantity: 1,
  },
  {
    buySell: BuySell.SELL,
    callPut: OptionType.PUT,
    delta: 0.5,
    dte: 0,
    quantity: 1,
  },
  {
    buySell: BuySell.BUY,
    callPut: OptionType.CALL,
    delta: 0.01,
    dte: 0,
    quantity: 1,
  },
  {
    buySell: BuySell.BUY,
    callPut: OptionType.PUT,
    delta: 0.01,
    dte: 0,
    quantity: 1,
  },
];

const DefaultCalendarSpreadLegsSettings = [
  {
    buySell: BuySell.SELL,
    callPut: OptionType.CALL,
    delta: 0.5,
    dte: 0,
    quantity: 1,
  },
  {
    buySell: BuySell.SELL,
    callPut: OptionType.PUT,
    delta: 0.5,
    dte: 0,
    quantity: 1,
  },
  {
    buySell: BuySell.BUY,
    callPut: OptionType.CALL,
    delta: 0.5,
    dte: 4,
    quantity: 1,
  },
  {
    buySell: BuySell.BUY,
    callPut: OptionType.PUT,
    delta: 0.5,
    dte: 4,
    quantity: 1,
  },
];

const DefaultTradeSettings: ITradeSettings = {
  isActive: false,
  isMocked: true,
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  percentGain: 0.10,
  percentLoss: 0.10,
  entryHour: 9,
  entryMinute: 32,
  exitHour: 11,
  exitMinute: 0,
  commissionPerContract: 1.00,
  symbol: '$SPX.X',
  tradeType: ['IC'],
  legs: [...DefaultIronCondorLegsSettings],
  emailAddress: 'none',
  phone: 'none',
  useShortOnlyForLimits: false,
  isPrerunning: false,
  prerunValue: {ticks: 0, amount: 0},
  isPrerunningVWAPSlope: false,
  prerunVWAPSlopeValue: {...defaultPrerunVWAPSlopeValue},
  isPrerunningVIXSlope: false,
  prerunVIXSlopeValue: {...defaultPrerunVIXSlopeValue},
  repeatStopHour: 16,
  prerunGainLimitValue: {...defaultPrerunGainLimitValue},
};

function getTwoDTEValues(legs) {
  if (legs.length != 4) {
    return '???';
  }
  return `${legs[0].actualDte || legs[0].dte},${legs[2].actualDte || legs[2].dte}`;
}

function GetDescription(tradeSettings: ITradeSettings) {
  let type = tradeSettings.tradeType?.length > 0 ? tradeSettings.tradeType[0] : 'Cust';
  if (type === 'CS') {
    type = `${type}(${getTwoDTEValues(tradeSettings.legs)})`;
  }

  const entryHour = tradeSettings.entryHour > 12 ? tradeSettings.entryHour - 12 : tradeSettings.entryHour;
  const exitHour = tradeSettings.exitHour > 12 ? tradeSettings.exitHour - 12 : tradeSettings.exitHour;
  const part0 = tradeSettings.name ? `${tradeSettings.name}: \n` : '';
  const part1 = `${tradeSettings.symbol} ${type}`;
  const part2 = `${entryHour}:${tradeSettings.entryMinute}-${exitHour}:${tradeSettings.exitMinute}`;
  const gainText = `${tradeSettings.percentGainIsDollar ? '$' : ''}${(tradeSettings.percentGain * 100).toFixed(1)}${tradeSettings.percentGainIsDollar ? '' : '%'}`;
  const lossText = `${tradeSettings.percentLossIsDollar ? '$' : ''}${(tradeSettings.percentLoss * 100).toFixed(1)}${tradeSettings.percentLossIsDollar ? '' : '%'}`;
  const part3 = `${gainText}/${lossText}`;
  let part4 = '';
  if (tradeSettings.csvSymbols) {
    let regex = new RegExp(`${tradeSettings.symbol}_......`, 'g');
    part4 = `\n${tradeSettings.csvSymbols.replace(regex, '').replace('VIX', '')}`;
    regex = new RegExp(`,`, 'g');
    part4 = part4.replace(regex, '\n');
  }
  let part5 = tradeSettings.isMocked ? 'Mocked' : '';
  if (tradeSettings.isPrerunning) {
    part5 = `Mocked for Prerun`;
  }
  if (tradeSettings.isPrerunningVWAPSlope) {
    part5 = `Mocked for Prerun VWAP Slope`;
  }
  if (tradeSettings.isPrerunningVIXSlope) {
    part5 = `Mocked for Prerun VIX Slope`;
  }
  if (tradeSettings.isPrerunningGainLimit) {
    part5 = `Mocked for Prerun Gain Limit`;
  }
  return `${part0}${part1}\n${part2}\n${part3}${part4}\n${part5}`;
}


export {
  whyClosedEnum,
  ITradeSettings as default,
  IPrice,
  IBacktestingData,
  GetDescription,
  DefaultTradeSettings,
  DefaultIronCondorLegsSettings,
  DefaultCalendarSpreadLegsSettings,
  BadDefaultIPrice,
  DefaultIPrice,
  DefaultIBacktestSummary,
  IBacktestSummary,
};