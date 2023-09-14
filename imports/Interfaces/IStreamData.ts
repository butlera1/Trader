interface IStreamerData {
  symbol?: string;
  mark?: number;
  volume?: number;
  volatility?: number;
  underlyingPrice?: number;
  when?: Date;
  slopeAngle?: number;
  vwap?: number;
  minMark?: number;
  maxMark?: number;
}

export default IStreamerData;