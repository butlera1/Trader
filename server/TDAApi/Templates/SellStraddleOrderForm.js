import _ from 'lodash';

const SellStraddleOrderTemplate =   {
  'orderStrategyType': 'SINGLE',
  'complexOrderStrategyType': 'STRADDLE',
  'session': 'NORMAL',
  'duration': 'DAY',
  'orderType': 'MARKET',
  'orderLegCollection': [
  {
    "instrument": {
      "assetType": "OPTION",
      "symbol": "XYZ_011819P45"
    },
    "instruction": "SELL_TO_OPEN",
    "quantity": 1
  },
  {
    "instrument": {
      "assetType": "OPTION",
      "symbol": "XYZ_011819C45"
    },
    "instruction": "SELL_TO_OPEN",
    "quantity": 1
  }
],
};

  function SellStraddleATMOrderForm(tickerSymbol, quantity){
  const form = _.cloneDeep(SellStraddleOrderTemplate);
  form.orderLegCollection[0].quantity = quantity;
  form.orderLegCollection[1].quantity = quantity;
  let date = dayjs();
  let strikePrice = 276;
  const finalOptionsSymbol= `${tickerSymbol}_${date.format('MMDDYY')}`;
  form.orderLegCollection[0].instrument.symbol = `{finalOptionsSymbol}P${strikePrice}`;
  form.orderLegCollection[1].instrument.symbol = `{finalOptionsSymbol}C${strikePrice}`;
  // TODO (AWB) Calculate option date and subsequent SYMBOL.
  return form;
}

export default SellStraddleATMOrderForm;