interface ICandle {
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
  datetime: number,
}

const DefaultCandle: ICandle = {
  open: 0,
  high: 0,
  low: 0,
  close: 0,
  volume: 0,
  datetime: 0,
};

export {ICandle as default, DefaultCandle} ;