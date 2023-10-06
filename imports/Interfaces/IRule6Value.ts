interface IRule6Value {
  minutes: number;
  underlyingPercentOfCredit: number;
}

const DefaultRule6Value: IRule6Value = {
  minutes: 10,
  underlyingPercentOfCredit: 0.3,
};

export {IRule6Value as default, DefaultRule6Value};