
interface ILegSettings {
  buySell: string,
  callPut: string,
  delta: number,
}

const DefaultLegSettings = {
  buySell: 'Buy',
  callPut: 'Call',
  delta: 0.50,
};

export {ILegSettings as default, DefaultLegSettings};