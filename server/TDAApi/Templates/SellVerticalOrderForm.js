import _ from 'lodash';

const VerticalOrderTemplate = {
  'orderStrategyType': 'SINGLE',
  'complexOrderStrategyType': 'VERTICAL',
  'session': 'NORMAL',
  'duration': 'DAY',
  'orderType': 'MARKET',
  'orderLegCollection': [
    {
      'instrument': {
        'assetType': 'OPTION',
        'symbol': 'XYZ_011819P45'
      },
      'instruction': 'SELL_TO_OPEN',
      'quantity': 1
    },
    {
      'instrument': {
        'assetType': 'OPTION',
        'symbol': 'XYZ_011819C45'
      },
      'instruction': 'BUY_TO_OPEN',
      'quantity': 1
    }
  ],
};

function VerticalOrderForm({buyOption, sellOption, quantity, isToOpen}) {
  const form = _.cloneDeep(VerticalOrderTemplate);
  const text = isToOpen ? '_TO_OPEN' : '_TO_CLOSE';
  StuffLegParams(form.orderLegCollection[0], buyOption.symbol, quantity, `BUY${text}`);
  StuffLegParams(form.orderLegCollection[1], sellOption.symbol, quantity, `SELL${text}`);

  return form;
}

export default VerticalOrderForm;