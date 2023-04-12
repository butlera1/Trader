interface IRule5Value {
  minutes: number;
  underlyingPercentOfCredit: number;
}

const DefaultRule5Value: IRule5Value = {
  minutes: 10,
  underlyingPercentOfCredit: 0.3,
};

export {IRule5Value as default, DefaultRule5Value};