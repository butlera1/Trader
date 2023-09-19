interface IPrerunVWAPSlopeValue {
  numberOfDesiredVWAPAnglesInARow: number;
}
const defaultPrerunVWAPSlopeValue: IPrerunVWAPSlopeValue = {
  numberOfDesiredVWAPAnglesInARow: 4,
};

export {IPrerunVWAPSlopeValue as default, defaultPrerunVWAPSlopeValue};