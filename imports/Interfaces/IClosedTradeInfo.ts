interface IClosedTradeInfo {
  isRepeat: boolean,
  isClosed: boolean,
  nowPrerunning: boolean,
  nowPrerunningVIXSlope: boolean,
  nowPrerunningGainLimit: boolean,
}

const DefaultClosedTradeInfo: IClosedTradeInfo = {
  isClosed: false,
  isRepeat: false,
  nowPrerunning: false,
  nowPrerunningVIXSlope: false,
  nowPrerunningGainLimit: false,
};


export {IClosedTradeInfo, DefaultClosedTradeInfo};