import _ from 'lodash';
import ILegSettings, {BuySell} from '../../../imports/Interfaces/ILegSettings';
import WrapFirstTriggersSecond from './WrapFirstTriggersSecond';
import StuffLegParams from './StuffLegParams';

const OrderLeg = {
  instruction: 'BUY_TO_OPEN',
  quantity: 1,
  instrument: {
    symbol: '$SYMBOL$',
    assetType: 'OPTION'
  }
};

const OptionTemplate = {
  orderStrategyType: 'SINGLE',
  orderType: 'MARKET',
  session: 'NORMAL',
  duration: 'DAY',
  orderLegCollection: [],
};

function GetOptionOrder(legs: ILegSettings[], quantity, isToClose) {
  const buyForm = _.cloneDeep(OptionTemplate);
  const sellForm = _.cloneDeep(OptionTemplate);
  legs.forEach((leg) => {
    const legOrder = _.cloneDeep(OrderLeg);
    let directionText = '_TO_OPEN';
    let buySell = leg.buySell === BuySell.BUY ? 'BUY' : 'SELL';
    if (isToClose) {
      directionText = '_TO_CLOSE';
      // Reverse the buySell direction.
      buySell = leg.buySell === BuySell.BUY ? 'SELL' : 'BUY';
    }
    StuffLegParams(legOrder, leg.option.symbol, quantity, `${buySell}${directionText}`);
    if (buySell === 'BUY') {
      buyForm.orderLegCollection.push(legOrder);
    } else {
      sellForm.orderLegCollection.push(legOrder);
    }
  });
  const firstTriggersSecondOrder = WrapFirstTriggersSecond(buyForm, sellForm);
  return firstTriggersSecondOrder;
  // const ordersArray = [buyForm, sellForm];
  // return ordersArray;
}

export default GetOptionOrder;
