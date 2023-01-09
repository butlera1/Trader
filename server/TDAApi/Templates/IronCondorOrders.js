import _ from 'lodash';
import StuffLegParams from './StuffLegParams';
import {BuySell, OptionType} from '../../../imports/Interfaces/ILegSettings';
import {GetNewYorkTimeAt} from '../../Trader';

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
  return {buyCallSymbol, sellCallSymbol, buyPutSymbol, sellPutSymbol};
}

function IronCondorMarketOrder(tradeSettings, isToOpen) {
  const {quantity, legs} = tradeSettings;
  const form = _.cloneDeep(SellIronCondorOrderForm);
  const text = isToOpen ? '_TO_OPEN' : '_TO_CLOSE';
  const {buyCallSymbol, sellCallSymbol, buyPutSymbol, sellPutSymbol} = Get4BuySellPutCallSymbols(legs);
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

function IronCondorLimitOrder(tradeSettings, isToOpen) {
  const form = IronCondorMarketOrder(tradeSettings, isToOpen);
  form.orderType = (tradeSettings.openingPrice < 0) ? 'NET_DEBIT' : 'NET_CREDIT';
  form.price = Number.parseFloat(tradeSettings.gainLimit.toFixed(2));
  return form;
}

function IronCondorStopOrder(tradeSettings, isToOpen) {
  const form = IronCondorMarketOrder(tradeSettings, isToOpen);
  form.orderType = 'STOP';
  form.stopType = 'MARK';
  form.stopPrice = Number.parseFloat(tradeSettings.lossLimit.toFixed(2));
  return form;
}

function IronCondorMarketOrderAtTime(tradeSettings, timeHour, timeMinute, isToOpen) {
  const form = IronCondorMarketOrder(tradeSettings, isToOpen);
  const time = GetNewYorkTimeAt(timeHour, timeMinute).tz('Etc/GMT', false);
  //  Example:  "releaseTime": "2023-01-07T20:55:00+0000",
  form.releaseTime = time.format(`YYYY-MM-DDThh:mm:ssZZ`);
  return form;
}

export {
  IronCondorMarketOrder,
  IronCondorLimitOrder,
  IronCondorStopOrder,
  IronCondorMarketOrderAtTime,
  Get4BuySellPutCallSymbols
};