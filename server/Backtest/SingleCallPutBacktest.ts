import dayjs, {Dayjs} from 'dayjs';
import ITradeSettings, {DefaultTradeSettings} from '../../imports/Interfaces/ITradeSettings';
import IRanges from '../../imports/Interfaces/IRanges';
import ICandle from '../../imports/Interfaces/ICandle';
import {GetHistoricalData} from '../TDAApi/TDAApi';
import {GetNewYorkTimeAt} from '../../imports/Utils';
import Constants from '../../imports/Constants';

const startOfTradeTime = GetNewYorkTimeAt(9, 30);

interface IBacktestResult {
  nextIndex: number,
}

export function SingleCallPutBacktest(data: [ICandle], index: number, tradeSetting: ITradeSettings): IBacktestResult {
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
function getStartIndex(tradeSetting: ITradeSettings): number {
  const startTrade = GetNewYorkTimeAt(tradeSetting.entryHour, tradeSetting.entryMinute);
  const minutes = startTrade.diff(startOfTradeTime, 'minute');
  return minutes;
}

export async function BacktestLoop(tradeSetting: ITradeSettings, ranges: IRanges) :Promise<IBacktestResult[]> {
  const start = dayjs();
  if (!tradeSetting.prerunGainLimitValue) {
    throw new Error('BacktesingLoop: tradeSetting.prerunGainLimitValue must be set.');
  }
  const results: IBacktestResult[] = [] as IBacktestResult[];
  for (let date: Dayjs = ranges.startDate; date.isBefore(ranges.endDate); date = date.add(1, 'day')) {
    const data = await GetHistoricalData(tradeSetting.userId, tradeSetting.symbol, date).catch((error) => {});
    if (!data) {
      continue; // Skip this day (weekend or holiday).
    }
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
  const end = dayjs();
  console.log(`BacktestLoop: ${end.diff(start, 'second')} seconds, for ${results.length.toLocaleString()} results.`);
  return results;
}

export async function TestBackTestCode() :Promise<void> {

  const ranges: IRanges = {
    startGain: 0.5,
    endGain: 1.5,
    gainIncrement: 0.1,
    startLoss: 0.5,
    endLoss: 1.5,
    lossIncrement: 0.1,
    startGainLimitPrerunAllowedDurationSeconds: 20,
    endGainLimitPrerunAllowedDurationSeconds: 180,
    gainLimitPrerunAllowedDurationSecondsIncrement: 20,
    startDate: dayjs().subtract(31, 'day'),
    endDate: dayjs(),
  };

  const tradeSetting: ITradeSettings = {
    ...DefaultTradeSettings,
    userId: 'g7gpWRiEBDqjysDFQ',
    symbol: Constants.SPXSymbol,
    entryHour: 9,
    entryMinute: 32,
    exitHour: 15,
    exitMinute: 45,
    gainLimit: 0.1,
    lossLimit: 0.1,
    isPrerunningGainLimit: true,
    prerunGainLimitValue: {
      seconds: 20,
    },
  };
  const results :IBacktestResult[] = await BacktestLoop(tradeSetting, ranges);
}