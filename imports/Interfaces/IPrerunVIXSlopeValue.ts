const DirectionUp = 'up';
const DirectionDown = 'down';

interface IPrerunVIXSlopeValue {
  numberOfDesiredVIXAnglesInARow?: number;
  direction?: 'up' | 'down';
}
const defaultPrerunVIXSlopeValue: IPrerunVIXSlopeValue = {
  numberOfDesiredVIXAnglesInARow: 4,
  direction: DirectionDown,
};


export {IPrerunVIXSlopeValue as default, defaultPrerunVIXSlopeValue, DirectionUp, DirectionDown};