import {Dayjs} from 'dayjs';
import ITradeSettings from '../../imports/Interfaces/ITradeSettings';
import IRanges from '../../imports/Interfaces/IRanges';
import ICandle from '../../imports/Interfaces/ICandle';
import {GetHistoricalData} from '../TDAApi/TDAApi';
import {GetNewYorkTimeAt} from '../../imports/Utils';

const startOfTradeTime = GetNewYorkTimeAt(9, 30);

interface IBacktestResult {
  nextIndex: number,
}

export function SingleCallPutBacktest(data: [ICandle], index:number, tradeSetting: ITradeSettings): IBacktestResult {
  // Start trade.
  // run until trade ends for any reason.
  // return trade result.
  return {nextIndex: index + 1};
}

/**
 * Given the current index, this method
 * @param currentIndex
 * @param tradeSetting
 */
function getStartIndex(tradeSetting: ITradeSettings):number {
  const startTrade = GetNewYorkTimeAt(tradeSetting.entryHour, tradeSetting.entryMinute);
  const minutes = startTrade.diff(startOfTradeTime, 'minute');
  return minutes;
}

export function BacktestLoop(tradeSetting: ITradeSettings, ranges: IRanges) {
  if (!tradeSetting.prerunGainLimitValue) {
    throw new Error('BacktesingLoop: tradeSetting.prerunGainLimitValue must be set.');
  }
  const results: IBacktestResult[] = [] as IBacktestResult[];
  for (let date: Dayjs = ranges.startDate; date.isBefore(ranges.endDate); date = date.add(1, 'day')) {
    const data = GetHistoricalData(tradeSetting.userId, tradeSetting.symbol, date);
    for (let gainLimit = ranges.startGain; gainLimit <= ranges.endGain; gainLimit += ranges.gainIncrement) {
      for (let lossLimit = ranges.startLoss; lossLimit <= ranges.endLoss; lossLimit += ranges.lossIncrement) {
        for (let seconds = ranges.startGainLimitPrerunAllowedDurationSeconds; seconds <= ranges.endGainLimitPrerunAllowedDurationSeconds; seconds += ranges.gainLimitPrerunAllowedDurationSecondsIncrement) {
          tradeSetting.gainLimit = gainLimit;
          tradeSetting.lossLimit = lossLimit;
          tradeSetting.prerunGainLimitValue.seconds = seconds;
          let timeIndex = getStartIndex(tradeSetting);
          while (timeIndex < data.length) {
            let result: IBacktestResult = SingleCallPutBacktest(data, timeIndex, tradeSetting);
            // Save result to database.
            timeIndex = result.nextIndex;
            results.push(result);
          }
        }
      }
    }
  }
}
