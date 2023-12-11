interface IPrerunGainLimitValue {
  seconds?: number;
}

const defaultPrerunGainLimitValue = {
  seconds: 30,
};

export {IPrerunGainLimitValue as default, defaultPrerunGainLimitValue};