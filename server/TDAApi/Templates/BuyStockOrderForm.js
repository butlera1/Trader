const BuyStockTemplate = {
  'orderType': 'MARKET',
  'session': 'NORMAL',
  'duration': 'DAY',
  'orderStrategyType': 'SINGLE',
  'orderLegCollection': [
    {
      'instruction': 'Buy',
      'quantity': 1,
      'instrument': {
        'symbol': '$SYMBOL$',
        'assetType': 'EQUITY'
      }
    }
  ]
};

function BuyStockOrderForm(tickerSymbol, quantity){
  const form = {...BuyStockTemplate};
  form.orderLegCollection[0].instrument.symbol = tickerSymbol;
  form.orderLegCollection[0].quantity = quantity;
  return form;
}

export default BuyStockOrderForm;