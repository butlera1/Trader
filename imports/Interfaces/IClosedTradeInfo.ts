import ITradeSettings, {DefaultTradeSettings} from './ITradeSettings';

interface IClosedTradeInfo {
  isRepeat: boolean,
  isClosed: boolean,
  settings: ITradeSettings,
  nowPrerunning: boolean,
  nowPrerunningVIXSlope: boolean,
  nowPrerunningGainLimit: boolean,
}

const DefaultClosedTradeInfo: IClosedTradeInfo = {
  isClosed: false,
  isRepeat: false,
  settings: {...DefaultTradeSettings},
  nowPrerunning: false,
  nowPrerunningVIXSlope: false,
  nowPrerunningGainLimit: false,
};


export {IClosedTradeInfo, DefaultClosedTradeInfo}