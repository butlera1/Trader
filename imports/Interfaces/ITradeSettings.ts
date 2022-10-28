import ILegSettings from "./ILegSettings";

interface ITradeSettings {
  _id?: string,
  userId?: string;
  isActive: boolean,
  dte: number,
  percentGain: number,
  percentLoss: number,
  entryHour: number,
  entryMinute: number,
  exitHour: number,
  exitMinute: number,
  accountNumber: string,
  quantity: number,
  symbol: string,
  emailAddress?: string,
  phone?: string,
  legs: ILegSettings[],
}

export const DefaultTradeSettings: ITradeSettings = {
  isActive: false,
  dte: 1,
  percentGain: 0.26,
  percentLoss: 1.00,
  entryHour: 9,
  entryMinute: 45,
  exitHour: 11,
  exitMinute: 45,
  accountNumber: 'none',
  quantity: 1,
  symbol: 'SPY',
  legs: [],
  emailAddress: 'none',
  phone: 'none'
};

export default ITradeSettings;