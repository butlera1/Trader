import ILegSettings, {BuySell, OptionType} from './ILegSettings';

interface IPrice {
  price: number,
  whenNY: Date,
  gain: number,
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
  whyClosed?: string,
  gainLoss?: number,
  openingOrderId?: string,
  closingOrderId?: string,
  openingPrice?: number,
  closingPrice?: number,
  csvSymbols?: string,
  monitoredPrices?: IPrice[],
  gainLimit?: number,
  lossLimit?: number,
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

function GetDescription(tradeSettings: ITradeSettings) {
  const type = tradeSettings.tradeType.length>0 ? tradeSettings.tradeType[0] : 'Cust';
  const part1 = `${tradeSettings.symbol}(${tradeSettings.quantity})`;
  const part2 = `${tradeSettings.entryHour}:${tradeSettings.entryMinute}-${tradeSettings.exitHour}:${tradeSettings.exitMinute}`;
  const part3 = `${tradeSettings.percentGain * 100}/${tradeSettings.percentLoss * 100} % ${type}`;
  let part4 = '';
  if (tradeSettings.csvSymbols) {
    const regex = new RegExp(`${tradeSettings.symbol}_......`, 'g');
    part4 = `\n${tradeSettings.csvSymbols.replace(regex, '')}`;
  }
  return `${part1}\n${part2}\n${part3}${part4}`;
}


export {
  ITradeSettings as default,
  IPrice,
  GetDescription,
  DefaultTradeSettings,
  DefaultIronCondorLegsSettings,
  DefaultCalendarSpreadLegsSettings
};