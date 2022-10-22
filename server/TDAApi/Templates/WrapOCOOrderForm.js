function WrapOCOOrderForm(ordersArray){
  const form = {
    orderStrategyType: 'OCO',
    childOrderStrategies: ordersArray,
  };
  return form;
}

export {WrapOCOOrderForm};