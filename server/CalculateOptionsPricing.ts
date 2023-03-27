import {IPrice} from '../imports/Interfaces/ITradeSettings';
import ILegSettings, {BuySell, OptionType} from '../imports/Interfaces/ILegSettings';

function CalculateOptionsPricings(result: IPrice, leg: ILegSettings, price: number) {
  let intrinsic = 0;
  if (leg.callPut === OptionType.CALL) {// CALL
    intrinsic = Math.max(0, result.underlyingPrice - leg.option.strikePrice);
  } else {
    intrinsic = Math.max(0, leg.option.strikePrice - result.underlyingPrice);
  }
  // Below does the opposite math because we have already Opened these options, so we are looking at
  // "TO_CLOSE" pricing where we buy back something we sold and sell something we previously purchased.
  if (leg.buySell === BuySell.BUY) {
    result.price = result.price - price;
    result.longStraddlePrice = result.longStraddlePrice - price;
    result.extrinsicLong += price - intrinsic;
  } else {
    // Sold options
    result.price = result.price + price;
    result.shortStraddlePrice = result.shortStraddlePrice + price;
    result.extrinsicShort += price - intrinsic;
  }
  return result;
}

export default CalculateOptionsPricings;