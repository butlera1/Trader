import {IPrice} from './Interfaces/ITradeSettings.ts';
import ILegSettings, {BuySell, OptionType} from './Interfaces/ILegSettings.ts';

function CalculateOptionsPricing(result: IPrice, leg: ILegSettings, price: number) {
  let intrinsic = 0;
  if (leg.callPut === OptionType.CALL) {// CALL
    intrinsic = Math.max(0, result.underlyingPrice - leg.option.strikePrice);
  } else {
    intrinsic = Math.max(0, leg.option.strikePrice - result.underlyingPrice);
  }
  const totalPrice = price * (leg.quantity ?? 1);
  // Below does the opposite math because we have already Opened these options, so we are looking at
  // "TO_CLOSE" pricing where we buy back something we sold and sell something we previously purchased.
  if (leg.buySell === BuySell.BUY) {
    result.price = result.price - totalPrice;
    result.longStraddlePrice = result.longStraddlePrice - totalPrice;
    result.extrinsicLong += totalPrice - intrinsic;
  } else {
    // Sold options
    result.price = result.price + totalPrice;
    result.shortStraddlePrice = result.shortStraddlePrice + totalPrice;
    result.extrinsicShort += totalPrice - intrinsic;
  }
  return result;
}

export default CalculateOptionsPricing;