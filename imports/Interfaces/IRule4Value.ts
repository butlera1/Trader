interface IRule4Value {
  minutes: number;
  underlyingMovement: number;
}

const DefaultRule4Value: IRule4Value = {
  minutes: 10,
  underlyingMovement: 0.80,
};

export {IRule4Value as default, DefaultRule4Value};