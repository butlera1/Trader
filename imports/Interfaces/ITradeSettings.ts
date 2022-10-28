interface ITradeSettings {
  isTrading: boolean,
  desiredDelta: number,
  percentGain: number,
  percentLoss: number,
  openHour: number,
  openMinute: number,
  closeHour: number,
  closeMinute:number,
  accountNumber: string,
  quantity: number,
  symbol: string,
  emailAddress?: string,
  phone?: string,
}

export default ITradeSettings;