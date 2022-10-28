import dayjs from "dayjs";

interface ITradeSettings {
  isTrading: boolean,
  desiredDelta: number,
  percentGain: number,
  percentLoss: number,
  entryHour: number,
  entryMinute: number,
  exitHour: number,
  exitMinute: number,
  accountNumber: string,
  quantity: number,
  symbol: string,
  tradeType:string,
  emailAddress?: string,
  phone?: string,
}

export const DefaultTradeSettings = {
  isTrading: false,
  desiredDelta: 0.25,
  percentGain: 0.26,
  percentLoss: 1.00,
  openHour: 9,
  openMinute: 45,
  closeHour: 11,
  closeMinute: 45,
  accountNumber: 'none',
  quantity: 1,
  symbol: 'SPY',
  emailAddress: 'none',
  phone: 'none'
};

export default ITradeSettings;