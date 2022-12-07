import _ from 'lodash';
import StuffLegParams from './StuffLegParams';
import {BuySell, OptionType} from '../../../imports/Interfaces/ILegSettings';

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

function IronCondorMarketOrder(tradeSettings, isToOpen) {
  const {quantity, legs} = tradeSettings;
  const form = _.cloneDeep(SellIronCondorOrderForm);
  const text = isToOpen ? '_TO_OPEN' : '_TO_CLOSE';
  let buyCallSymbol = '';
  let sellCallSymbol = '';
  let buyPutSymbol = '';
  let sellPutSymbol = '';
  legs.forEach((leg) => {
    const symbol = leg.option.symbol;
    if (leg.buySell === BuySell.SELL) {
      if (leg.callPut === OptionType.CALL) {
        sellCallSymbol = symbol;
      } else {
        sellPutSymbol = symbol;
      }
    } else {
      if (leg.callPut === OptionType.CALL) {
        buyCallSymbol = symbol;
      } else {
        buyPutSymbol = symbol;
      }
    }
  });
  if (isToOpen) {
    StuffLegParams(form.orderLegCollection[0], buyCallSymbol, quantity, `BUY${text}`);
    StuffLegParams(form.orderLegCollection[1], sellCallSymbol, quantity, `SELL${text}`);
    StuffLegParams(form.orderLegCollection[2], buyPutSymbol, quantity, `BUY${text}`);
    StuffLegParams(form.orderLegCollection[3], sellPutSymbol, quantity, `SELL${text}`);
  } else {
    StuffLegParams(form.orderLegCollection[0], buyCallSymbol, quantity, `SELL${text}`);
    StuffLegParams(form.orderLegCollection[1], sellCallSymbol, quantity, `BUY${text}`);
    StuffLegParams(form.orderLegCollection[2], buyPutSymbol, quantity, `SELL${text}`);
    StuffLegParams(form.orderLegCollection[3], sellPutSymbol, quantity, `BUY${text}`);
  }
  return form;
}

function IronCondorLimitOrder(tradeSettings, price, isToOpen) {
  const form = IronCondorMarketOrder(tradeSettings, isToOpen);
  form.orderType = 'NET_DEBIT';
  form.price = price.toString();
  return form;
}

function IronCondorStopOrder(tradeSettings, price, isToOpen) {
  const form = IronCondorMarketOrder(tradeSettings, isToOpen);
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