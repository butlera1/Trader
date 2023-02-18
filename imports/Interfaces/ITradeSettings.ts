import ILegSettings, {BuySell, OptionType} from './ILegSettings';
import {IRule1Value} from '../ui/TradeSettings/Rules/Rule1';

enum whyClosedEnum {
  emergencyExit = 'emergencyExit',
  gainLimit = 'gainLimit',
  lossLimit = 'lossLimit',
  timedExit = 'timedExit',
  rule1Exit = 'r1Exit',
  rule2Exit = 'r2Exit',
}

interface IPrice {
  price: number,
  whenNY?: Date,
  gain?: number,
  underlyingPrice?: number,
  vix?: number,
  shortStraddlePrice?: number,
  longStraddlePrice?: number,
  extrinsicShort?: number,
  extrinsicLong?: number,
}

const BadDefaultIPrice = {
  price: Number.NaN,
  whenNY: undefined,
  gain: 0,
  underlyingPrice: 0,
  vix: 0,
  shortStraddlePrice: 0,
  longStraddlePrice: 0,
  extrinsicShort: 0,
  extrinsicLong: 0,
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
  percentLoss: number,
  entryHour: number,
  entryMinute: number,
  exitHour: number,
  exitMinute: number,
  quantity: number,
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
  originalTradeSettingsId?: string,
  useShortOnlyForLimits?: boolean,
  isRule1?: boolean,
  isRule2?: boolean,
  rule1Value?: IRule1Value,
  rule2Value?: any,
  totalFees?: number,
  slope1Samples?: number,
  slope2Samples?: number,
}

const DefaultIronCondorLegsSettings = [
  {
    buySell: BuySell.SELL,
    callPut: OptionType.CALL,
    delta: 0.5,
    dte: 0,
  },
  {
    buySell: BuySell.SELL,
    callPut: OptionType.PUT,
    delta: 0.5,
    dte: 0,
  },
  {
    buySell: BuySell.BUY,
    callPut: OptionType.CALL,
    delta: 0.01,
    dte: 0,
  },
  {
    buySell: BuySell.BUY,
    callPut: OptionType.PUT,
    delta: 0.01,
    dte: 0,
  },
];

const DefaultCalendarSpreadLegsSettings = [
  {
    buySell: BuySell.SELL,
    callPut: OptionType.CALL,
    delta: 0.5,
    dte: 0,
  },
  {
    buySell: BuySell.SELL,
    callPut: OptionType.PUT,
    delta: 0.5,
    dte: 0,
  },
  {
    buySell: BuySell.BUY,
    callPut: OptionType.CALL,
    delta: 0.5,
    dte: 4,
  },
  {
    buySell: BuySell.BUY,
    callPut: OptionType.PUT,
    delta: 0.5,
    dte: 4,
  },
];

const DefaultTradeSettings: ITradeSettings = {
  isActive: false,
  isMocked: false,
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  percentGain: 0.10,
  percentLoss: 1.00,
  entryHour: 9,
  entryMinute: 50,
  exitHour: 11,
  exitMinute: 30,
  quantity: 1,
  commissionPerContract: 0.25,
  symbol: 'QQQ',
  tradeType: ['IC'],
  legs: [...DefaultIronCondorLegsSettings],
  emailAddress: 'none',
  phone: 'none',
  useShortOnlyForLimits: true,
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
  const part0 = tradeSettings.name ? `${tradeSettings.name}: \n` : '';
  const part1 = `${tradeSettings.symbol}(${tradeSettings.quantity}) ${type}`;
  const part2 = `${tradeSettings.entryHour}:${tradeSettings.entryMinute}-${tradeSettings.exitHour}:${tradeSettings.exitMinute}`;
  const part3 = `${(tradeSettings.percentGain * 100).toFixed(1)}/${(tradeSettings.percentLoss * 100).toFixed(1)} %`;
  let part4 = '';
  if (tradeSettings.csvSymbols) {
    const regex = new RegExp(`${tradeSettings.symbol}_......`, 'g');
    part4 = `\n${tradeSettings.csvSymbols.replace(regex, '').replace('VIX', '')}`;
  }
  return `${part0}${part1}\n${part2}\n${part3}${part4}`;
}


export {
  whyClosedEnum,
  ITradeSettings as default,
  IPrice,
  GetDescription,
  DefaultTradeSettings,
  DefaultIronCondorLegsSettings,
  DefaultCalendarSpreadLegsSettings,
  BadDefaultIPrice,
};