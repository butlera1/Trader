import ICandle from "../../imports/Interfaces/ICandle.ts";

interface ITickData {
  ex: string[];
  mkt: string[];
  price: number[];
  seq: number[];
  shares: number[];
  sl: string[];
  sub_mkt: string[];
  ts: number[];
}

const sample = {
  "ex": [
    "Q",
    "Q",
    "Q",
    "Q",
    "Q",
    "Q",
    "Q",
    "Q",
    "Q",
    "Q"
  ],
  "mkt": [
    "K",
    "K",
    "K",
    "K",
    "K",
    "K",
    "K",
    "K",
    "K",
    "K"
  ],
  "price": [
    179.35,
    179.35,
    179.35,
    179.35,
    179.48,
    179.95,
    180.35,
    179.35,
    179.35,
    179.35
  ],
  "seq": [
    64234,
    64238,
    64329,
    64360,
    66634,
    66645,
    66660,
    66682,
    67308,
    68280
  ],
  "shares": [
    50,
    10,
    100,
    10,
    4,
    31,
    1,
    2,
    1,
    3
  ],
  "sl": [
    "@ TI",
    "@ TI",
    "@ T ",
    "@ TI",
    "@ TI",
    "@ TI",
    "@ TI",
    "@ TI",
    "@ TI",
    "@ TI"
  ],
  "sub_mkt": [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    ""
  ],
  "ts": [
    1694419200008,
    1694419200008,
    1694419200008,
    1694419200008,
    1694419200012,
    1694419200012,
    1694419200012,
    1694419200012,
    1694419200013,
    1694419200014
  ]
};

function ConvertTickDataToCandle(tickData: ITickData): ICandle[] {
  const candles: ICandle[] = [];
  tickData.price.forEach((price, index) => {
    const candle: ICandle = {
      datetime: tickData.ts[index],
      open: price,
      high: price,
      low: price,
      close: price,
      volume: tickData.shares[index],
    };
    candles.push(candle);
  });
  return candles
}

export {ConvertTickDataToCandle as default};