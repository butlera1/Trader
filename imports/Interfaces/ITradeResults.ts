interface ITradeResults {
  _id?: string,
  userId: string,
  symbol: string,
  quantity: number,
  whenOpened?: string,
  whenClosed?: string,
  whyClosed?: string,
  gainLoss?: number,
  openingPrice?: number,
  closingPrice?: number,
  tradeId: string,
  isMocked: boolean,
}