
interface ILegSettings {
  buySell: string,
  callPut: string,
  quantity: number,
  delta: number,
}

export const DefaultLegSettings = {
  buySell: 'Buy',
  callPut: 'Call',
  quantity: 1,
  delta: 50,
};

export default ILegSettings;