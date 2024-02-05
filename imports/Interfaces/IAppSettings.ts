interface IAppSettings {
  _id?: string,
  startHourNY: number,
  startMinuteNY: number,
  endOfDayHourNY: number,
  endOfDayMinuteNY: number,
  maxPublishedTrades: number,
  slopeSamplesToAverage: number,
  totalSlopeSamples: number,
  vwapNumberOfSamples: number,
  vwapEquity: string,
  vwapSlopeSamplesRequired?: number,
  maxBacktestSummaries?: number,
  backgroundPollingIntervalMillisecs?: number,
  usingMarkPrice: boolean,
}

const DefaultAppSettings: IAppSettings = {
  startHourNY: 9,
  startMinuteNY: 29,
  endOfDayHourNY: 16,
  endOfDayMinuteNY: 15,
  maxPublishedTrades: 50,
  slopeSamplesToAverage: 5,
  totalSlopeSamples: 10,
  vwapNumberOfSamples: 60,
  vwapEquity: 'SPY',
  vwapSlopeSamplesRequired: 10,
  maxBacktestSummaries: 200,
  backgroundPollingIntervalMillisecs: 5000,
  usingMarkPrice: false,
};

export {IAppSettings, DefaultAppSettings} ;