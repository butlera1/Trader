import _ from 'lodash';
import StuffLegParams from './StuffLegParams';

const SellIronCondorOrderForm = {
  'session': 'NORMAL',
  'duration': 'DAY',
  'orderType': 'MARKET',
  'complexOrderStrategyType': 'IRON_CONDOR',
  'quantity': 1,
  'orderStrategyType': 'SINGLE',
  'orderLegCollection': [
    {
      'instruction': 'SELL_TO_OPEN',
      'quantity': 1,
      'instrument': {
        'assetType': 'OPTION',
        'symbol': 'SPY_101722C362'
      },
    },
    {
      'instruction': 'BUY_TO_OPEN',
      'quantity': 1,
      'instrument': {
        'assetType': 'OPTION',
        'symbol': 'SPY_101722C367'
      },
    },
    {
      'instruction': 'SELL_TO_OPEN',
      'quantity': 1,
      'instrument': {
        'assetType': 'OPTION',
        'symbol': 'SPY_101722P352'
      },
    },
    {
      'instruction': 'Buy_TO_OPEN',
      'quantity': 1,
      'instrument': {
        'assetType': 'OPTION',
        'symbol': 'SPY_101722P347'
      },
    }
  ],
};

function IronCondorMarketOrder(buyCall, sellCall, buyPut, sellPut, quantity, isToOpen) {
  const form = _.cloneDeep(SellIronCondorOrderForm);
  const text = isToOpen ? '_TO_OPEN' : '_TO_CLOSE';
  StuffLegParams(form.orderLegCollection[0], buyCall.symbol, quantity, `BUY${text}`);
  StuffLegParams(form.orderLegCollection[1], sellCall.symbol, quantity, `SELL${text}`);
  StuffLegParams(form.orderLegCollection[2], buyPut.symbol, quantity, `BUY${text}`);
  StuffLegParams(form.orderLegCollection[3], sellPut.symbol, quantity, `SELL${text}`);
  return form;
}

function IronCondorLimitOrder(buyCall, sellCall, buyPut, sellPut, quantity, price) {
  const form = IronCondorMarketOrder(buyCall, sellCall, buyPut, sellPut, quantity, false);
  form.orderType = 'NET_DEBIT';
  form.price = price.toString();
  return form;
}

function IronCondorStopOrder(buyCall, sellCall, buyPut, sellPut, quantity, price) {
  const form = IronCondorMarketOrder(buyCall, sellCall, buyPut, sellPut, quantity, false);
  form.orderType = 'STOP';
  form.stopType = 'MARK';
  form.stopPrice = price.toString();
  return form;
}

function IronCondorSellMarketAtNoonOrder(buyCall, sellCall, buyPut, sellPut, quantity) {
  const form = IronCondorMarketOrder(buyCall, sellCall, buyPut, sellPut, quantity, false);
  // TODO (AWB) Fix the date time to be today's and adjusted for New York time.
  form.releaseTime = '2022-10-17T16:00:00+0000';
  return form;
}

export {IronCondorMarketOrder, IronCondorLimitOrder, IronCondorStopOrder, IronCondorSellMarketAtNoonOrder};