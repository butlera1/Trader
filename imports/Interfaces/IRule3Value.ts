interface IRule3Value {
  gainPercent: number;
  minutes: number;
  trailingStopPercent: number;
}

const DefaultRule3Value: IRule3Value = {
  gainPercent: 0.20,
  minutes: 10,
  trailingStopPercent: 0.10,
};

export {IRule3Value as default, DefaultRule3Value};