import {Get4BuySellPutCallSymbols} from './SellIronCondorOrder';
import SellVerticalOrderForm from './SellVerticalOrderForm';
import WrapFirstTriggersSecond from './WrapFirstTriggersSecond';

function CalendarSpreadMarketOrder(tradeSettings, isToOpen) {
  const {buyCallSymbol, sellCallSymbol, buyPutSymbol, sellPutSymbol} = Get4BuySellPutCallSymbols(tradeSettings.legs);
  const callForm = SellVerticalOrderForm(buyCallSymbol, sellCallSymbol, tradeSettings.quantity, isToOpen);
  const putForm = SellVerticalOrderForm(buyPutSymbol, sellPutSymbol, tradeSettings.quantity, isToOpen);
  callForm.complexOrderStrategyType = 'CALENDAR';
  putForm.complexOrderStrategyType = 'CALENDAR';
  const form = WrapFirstTriggersSecond(putForm, callForm);
  return form;
}

export {CalendarSpreadMarketOrder};