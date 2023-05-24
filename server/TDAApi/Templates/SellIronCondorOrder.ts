import _ from 'lodash';
import StuffLegParams from './StuffLegParams';
import {BuySell, OptionType} from '../../../imports/Interfaces/ILegSettings';

interface ISymbolQuantity {
  symbol: string,
  quantity: number
}

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

function Get4BuySellPutCallSymbols(legs) {
  let buyCallSymbol = {symbol: '', quantity: 1};
  let sellCallSymbol = {symbol: '', quantity: 1};
  let buyPutSymbol = {symbol: '', quantity: 1};
  let sellPutSymbol = {symbol: '', quantity: 1};
  legs.forEach((leg) => {
    const symbol = leg.option.symbol;
    const quantity = leg.quantity;
    if (leg.buySell === BuySell.SELL) {
      if (leg.callPut === OptionType.CALL) {
        sellCallSymbol.symbol = symbol;
        sellCallSymbol.quantity = quantity;
      } else {
        sellPutSymbol.symbol = symbol;
        sellPutSymbol.quantity = quantity;
      }
    } else {
      if (leg.callPut === OptionType.CALL) {
        buyCallSymbol.symbol = symbol;
        buyCallSymbol.quantity = quantity;
      } else {
        buyPutSymbol.symbol = symbol;
        buyPutSymbol.quantity = quantity;
      }
    }
  });
  return {buyCallSymbol, sellCallSymbol, buyPutSymbol, sellPutSymbol};
}

function IronCondorMarketOrder(tradeSettings, isToOpen) {
  const {legs} = tradeSettings;
  const form = _.cloneDeep(SellIronCondorOrderForm);
  const text = isToOpen ? '_TO_OPEN' : '_TO_CLOSE';
  const {buyCallSymbol, sellCallSymbol, buyPutSymbol, sellPutSymbol} = Get4BuySellPutCallSymbols(legs);
  if (isToOpen) {
    StuffLegParams(form.orderLegCollection[0], buyCallSymbol.symbol, buyCallSymbol.quantity, `BUY${text}`);
    StuffLegParams(form.orderLegCollection[1], sellCallSymbol.symbol, sellCallSymbol.quantity, `SELL${text}`);
    StuffLegParams(form.orderLegCollection[2], buyPutSymbol.symbol, buyPutSymbol.quantity, `BUY${text}`);
    StuffLegParams(form.orderLegCollection[3], sellPutSymbol.symbol, sellPutSymbol.quantity, `SELL${text}`);
  } else {
    StuffLegParams(form.orderLegCollection[0], buyCallSymbol.symbol, buyCallSymbol.quantity, `SELL${text}`);
    StuffLegParams(form.orderLegCollection[1], sellCallSymbol.symbol, sellCallSymbol.quantity, `BUY${text}`);
    StuffLegParams(form.orderLegCollection[2], buyPutSymbol.symbol, buyPutSymbol.quantity, `SELL${text}`);
    StuffLegParams(form.orderLegCollection[3], sellPutSymbol.symbol, sellPutSymbol.quantity, `BUY${text}`);
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

export {
  IronCondorMarketOrder,
  IronCondorLimitOrder,
  IronCondorStopOrder,
  Get4BuySellPutCallSymbols
};