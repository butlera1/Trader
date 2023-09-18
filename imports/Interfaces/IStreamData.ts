interface IStreamerData {
  symbol?: string;
  mark?: number;
  volume?: number;
  volatility?: number;
  underlyingPrice?: number;
  when?: Date;
  slopeAngle?: number;
  vwap?: number;
  vwapSlopeAngle?: number;
  minMark?: number;
  maxMark?: number;
  tickVolume?: number;
}

export default IStreamerData;