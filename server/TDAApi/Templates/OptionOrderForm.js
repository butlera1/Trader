import _ from 'lodash';

const OptionTemplate = {
  'orderType': 'MARKET',
  'session': 'NORMAL',
  'duration': 'DAY',
  'orderStrategyType': 'SINGLE',
  'orderLegCollection': [
    {
      'instruction': 'BUY_TO_OPEN',
      'quantity': 1,
      'instrument': {
        'symbol': '$SYMBOL$',
        'assetType': 'OPTION'
      }
    }
  ]
};

function stuffParams(leg, symbol, quantity, instruction) {
  leg.quantity = quantity;
  leg.instrument.symbol = symbol;
  leg.instruction = instruction;
}

function OptionOrderForm(symbol, quantity, isToClose, isBuy) {
  const form = _.cloneDeep(OptionTemplate);
  form.orderLegCollection[0].instrument.symbol = symbol;
  form.orderLegCollection[0].quantity = quantity;
  const directionText = isToClose ? '_TO_CLOSE' : '_TO_OPEN';
  const buySell = isBuy ? 'BUY' : 'SELL';
  stuffParams(form.orderLegCollection[0], symbol, quantity, `${buySell}${directionText}`);
  return form;
}

export default OptionOrderForm;