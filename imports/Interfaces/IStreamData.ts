interface IStreamerData {
  symbol?: string;
  mark?: number;
  volume?: number;
  volatility?: number;
  underlyingPrice?: number;
  when?: Date;
}

export default IStreamerData;