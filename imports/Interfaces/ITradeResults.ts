import {IPrice} from './ITradeSettings';

interface ITradeResults {
  _id?: string,
  userId: string,
  symbol: string,
  quantity: number,
  description?: string,
  whenOpened?: string,
  whenClosed?: string,
  whyClosed?: string,
  gainLoss?: number,
  openingPrice?: number,
  closingPrice?: number,
  tradeId: string,
  isMocked: boolean,
  sum?: number,
  monitoredPrices?: IPrice[],
}

export default ITradeResults;