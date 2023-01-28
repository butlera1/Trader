import ILegSettings, {BuySell, OptionType} from './ILegSettings';

enum whyClosedEnum {
  emergencyExit = 'emergencyExit',
  gainLimit = 'gainLimit',
  lossLimit = 'lossLimit',
  timedExit = 'timedExit',
}

interface IPrice {
  price: number,
  whenNY: Date,
  gain: number,
  underlyingPrice?: number,
  vix?: number,
  shortStraddlePrice?: number,
  longStraddlePrice?: number,
  extrinsicShort?: number,
  extrinsicLong?: number,
}

interface ITradeSettings {
  _id?: string,
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
  symbol: string,
  days: string[],
  emailAddress?: string,
  phone?: string,
  tradeType?: string[];
  legs: ILegSettings[],
  openingOrder?: any,
  closingOrder?: any,
  whenOpened?: string,
  whenClosed?: string,
  whyClosed?: whyClosedEnum,
  gainLoss?: number,
  openingOrderId?: string,
  closingOrderId?: string,
  openingPrice?: number,
  closingPrice?: number,
  csvSymbols?: string,
  underlyingPrice?: number,
  monitoredPrices?: IPrice[],
  gainLimit?: number,
  lossLimit?: number,
  isRepeat?: boolean,
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
  symbol: 'QQQ',
  tradeType: ['IC'],
  legs: [...DefaultIronCondorLegsSettings],
  emailAddress: 'none',
  phone: 'none'
};

function getTwoDTEValues(legs) {
  if (legs.length != 4) {
    return '???';
  }
  return `${legs[0].dte},${legs[2].dte}`;
}

function GetDescription(tradeSettings: ITradeSettings) {
  let type = tradeSettings.tradeType?.length > 0 ? tradeSettings.tradeType[0] : 'Cust';
  if (type === 'CS') {
    type = `${type}(${getTwoDTEValues(tradeSettings.legs)})`;
  }
  const part1 = `${tradeSettings.symbol}(${tradeSettings.quantity}) ${type}`;
  const part2 = `${tradeSettings.entryHour}:${tradeSettings.entryMinute}-${tradeSettings.exitHour}:${tradeSettings.exitMinute}`;
  const part3 = `${Math.trunc(tradeSettings.percentGain * 100)}/${Math.trunc(tradeSettings.percentLoss * 100)} %`;
  let part4 = '';
  if (tradeSettings.csvSymbols) {
    const regex = new RegExp(`${tradeSettings.symbol}_......`, 'g');
    part4 = `\n${tradeSettings.csvSymbols.replace(regex, '')}`;
  }
  return `${part1}\n${part2}\n${part3}${part4}`;
}


export {
  whyClosedEnum,
  ITradeSettings as default,
  IPrice,
  GetDescription,
  DefaultTradeSettings,
  DefaultIronCondorLegsSettings,
  DefaultCalendarSpreadLegsSettings
};