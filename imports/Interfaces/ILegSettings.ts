enum OptionType {
  PUT = 'Put',
  CALL = 'Call'
}

enum BuySell {
  BUY = 'Buy',
  SELL = 'Sell'
}

interface IOption {
  putCall: OptionType,
  symbol: string,
  description: string,
  exchangeName: string,
  bidPrice: number,
  askPrice: number,
  lastPrice: number,
  markPrice: number,
  bidSize: number,
  askSize: number,
  lastSize: number,
  highPrice: number,
  lowPrice: number,
  openPrice: number,
  closePrice: number,
  totalVolume: number,
  quoteTimeInLong: number,
  tradeTimeInLong: number,
  netChange: number,
  volatility: number,
  delta: number,
  gamma: number,
  theta: number,
  vega: number,
  rho: number,
  timeValue: number,
  openInterest: number,
  isInTheMoney: boolean,
  theoreticalOptionValue: number,
  theoreticalVolatility: number,
  isMini: boolean,
  isNonStandard: boolean,
  optionDeliverablesList: [
    {
      symbol: string,
      assetType: string,
      deliverableUnits: string,
      currencyType: string,
    }
  ],
  strikePrice: number,
  expirationDate: string,
  expirationType: string,
  multiplier: number,
  settlementType: string,
  deliverableNote: string,
  isIndexOption: false,
  percentChange: number,
  markChange: number,
  markPercentChange: number,
}

interface ILegSettings {
  buySell: BuySell,
  callPut: OptionType,
  delta: number,
  option?: IOption,
}

const DefaultLegSettings = {
  buySell: BuySell.BUY,
  callPut: OptionType.CALL,
  delta: 0.50,
};

export {ILegSettings as default, DefaultLegSettings, BuySell, OptionType};