import _ from 'lodash';

function WrapFirstTriggersSecond(first, second) {
  const firstTriggersSecondOrder = _.cloneDeep(first);
  firstTriggersSecondOrder.orderStrategyType = 'TRIGGER';
  firstTriggersSecondOrder.childOrderStrategies = [_.cloneDeep(second)];
  return firstTriggersSecondOrder;
}

export default WrapFirstTriggersSecond;