import ILegSettings from './ILegSettings';

interface ITradeSettings {
  _id?: string,
  userId?: string;
  accountNumber?: string;
  userName?: string;
  isActive: boolean,
  isMocked: boolean,
  dte: number,
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
}

export const DefaultTradeSettings: ITradeSettings = {
  isActive: false,
  isMocked: false,
  days: [],
  dte: 1,
  percentGain: 0.26,
  percentLoss: 1.00,
  entryHour: 9,
  entryMinute: 45,
  exitHour: 11,
  exitMinute: 45,
  quantity: 1,
  symbol: 'SPY',
  legs: [],
  emailAddress: 'none',
  phone: 'none'
};

export default ITradeSettings;