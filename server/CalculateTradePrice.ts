import ITradeSettings, {BadDefaultIPrice, IPrice} from "../imports/Interfaces/ITradeSettings.ts";
import {AppSettings} from "./collections/AppSettings";
import Constants from "../imports/Constants.ts";
import {BuySell} from "../imports/Interfaces/ILegSettings.ts";
import CalculateOptionsPricing from "../imports/CalculateOptionsPricing.ts";

function CalculateTradePrice(tradeSettings: ITradeSettings, quotes) {
  const {usingMarkPrice} = AppSettings.findOne(Constants.appSettingsId);
  let countFoundQuotes = 0; // must end up equal to the legs.length.
  // Now scan the quotes and add/subtract up the price.
  let result: IPrice = {...BadDefaultIPrice, price: 0, whenNY: new Date()};
  quotes.forEach((quote) => {
    const leg = tradeSettings.legs.find((leg) => leg.option.symbol===quote.symbol);
    // if leg not found, then something is wrong.
    if (!leg) {
      const msg = `GetPriceForOptions: leg not found for quote symbol: ${quote.symbol}`;
      throw new Error(msg);
    }
    // The quotes include the underlying stock price.
    result.underlyingPrice = quote.underlyingPrice;
    let price = 0;
    // We have tried using the mark price or the bidPrice/askPrice this IF statement
    // is used to keep both chunks of code logic, so we can easily switch back and forth.
    if (usingMarkPrice) {
      price = quote.mark;
    } else {
      // Base price on the lower value relative to the opposite desired entry buySell direction.
      // This is because entry is simply a time point while exit is based on value and the legs
      // define the buySell direction based on trade entry. So, do the opposite for exit.
      price = quote.bidPrice;
      if (leg.buySell===BuySell.SELL) {
        // Means we are buying this leg now to exit the trade.
        price = quote.askPrice;
      }
    }
    result = CalculateOptionsPricing(result, leg, price);
    countFoundQuotes++;
  });
  if (countFoundQuotes!==tradeSettings.legs.length) {
    const msg = `CalculateTradePrice: countFoundQuotes: ${countFoundQuotes} !== tradeSettings.legs.length: ${tradeSettings.legs.length}`;
    console.error(msg);
    return {...BadDefaultIPrice};
  }
  return result;
}

export default CalculateTradePrice;