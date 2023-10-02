interface IPrerunVIXSlopeValue {
  numberOfDesiredVIXAnglesInARow: number;
}
const defaultPrerunVIXSlopeValue: IPrerunVIXSlopeValue = {
  numberOfDesiredVIXAnglesInARow: 4,
};

export {IPrerunVIXSlopeValue as default, defaultPrerunVIXSlopeValue};