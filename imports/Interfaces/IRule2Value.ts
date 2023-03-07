interface IRule2Value {
  amount: number;
  ticks: number;
}

const DefaultRule2Value: IRule2Value = {
  amount: 0.01,
  ticks: 5,
};

export {IRule2Value as default, DefaultRule2Value};