import dayjs, {Dayjs} from 'dayjs';
import ITradeSettings, {DefaultTradeSettings, whyClosedEnum} from '../../imports/Interfaces/ITradeSettings';
import IRanges from '../../imports/Interfaces/IRanges';
import ICandle from '../../imports/Interfaces/ICandle';
import {GetHistoricalData} from '../TDAApi/TDAApi';
import {GetNewYorkTimeAt} from '../../imports/Utils';
import Constants from '../../imports/Constants';
import {OptionType} from '../../imports/Interfaces/ILegSettings';
import {isoWeekdayNames} from '../Trader';

const startOfTradeTime = GetNewYorkTimeAt(9, 30);

interface IBacktestResult {
  nextIndex: number,
  tradeSetting: ITradeSettings,
}
interface ISummary {
  totalGain: number,
    totalLoss: number,
    wins: number,
    losses: number,
    averageDurationMin: number,
    averageWinsDurationMin: number,
    averageLossesDurationMin: number,
    dayOfWeek: string,
    date: string,
}

function checkForLossAndSet(low, tradeSetting: ITradeSettings): boolean {
  if (low <= -tradeSetting.lossLimit) {
    tradeSetting.whyClosed = whyClosedEnum.lossLimit;
    tradeSetting.gainLoss = -tradeSetting.lossLimit;
    return true;
  }
  return false;
}

function checkForGainAndSet(high, tradeSetting: ITradeSettings): boolean {
  if (high >= tradeSetting.gainLimit) {
    tradeSetting.whyClosed = whyClosedEnum.gainLimit;
    tradeSetting.gainLoss = tradeSetting.gainLimit;
    return true;
  }
  return false;
}

function seeIfTradeIsClosed(tradeSetting: ITradeSettings, data: ICandle, isCall): void {
  const checkLowFirst = Math.random() > 0.5;
  const low = isCall ? data.low : data.high;
  const high = isCall ? data.high : data.low;
  const loss = (low - tradeSetting.openingPrice) / 2; // Take 1/2 assuming delta 50 options.
  const gain = (high - tradeSetting.openingPrice) / 2; // Take 1/2 assuming delta 50 options.
  if (checkLowFirst) {
    if (checkForLossAndSet(loss, tradeSetting)) {
    } else {
      checkForGainAndSet(gain, tradeSetting);
    }
  } else {
    if (checkForGainAndSet(gain, tradeSetting)) {
    } else {
      checkForLossAndSet(loss, tradeSetting);
    }
  }
}

function SingleCallPutBacktest(data: [ICandle], index: number, tradeSetting: ITradeSettings): IBacktestResult {
  // Start trade.
  tradeSetting.whenOpened = new Date(data[index].datetime);
  tradeSetting.openingPrice = data[index].open;
  tradeSetting.gainLoss = 0;
  delete tradeSetting.whyClosed;
  const endIndex = Math.min(getEndIndex(tradeSetting) + 1, data.length);
  const isCall = tradeSetting.legs[0].callPut === OptionType.CALL;
  while (index < endIndex && !tradeSetting.whyClosed) {
    seeIfTradeIsClosed(tradeSetting, data[index], isCall);
    index++;
  }
  if (!tradeSetting.whyClosed) {
    tradeSetting.whyClosed = whyClosedEnum.timedExit;
    tradeSetting.gainLoss = data[index - 1].close - tradeSetting.openingPrice;
  }
  if (tradeSetting.whyClosed) {
    tradeSetting.whenClosed = new Date(data[index - 1].datetime);
  }
  // return trade result.
  return {nextIndex: index, tradeSetting};
}

function getStartIndex(tradeSetting: ITradeSettings): number {
  const startTrade = GetNewYorkTimeAt(tradeSetting.entryHour, tradeSetting.entryMinute);
  const minutes = startTrade.diff(startOfTradeTime, 'minute');
  return minutes;
}

function getEndIndex(tradeSetting: ITradeSettings): number {
  const startTrade = GetNewYorkTimeAt(tradeSetting.exitHour, tradeSetting.exitMinute);
  const minutes = startTrade.diff(startOfTradeTime, 'minute');
  return minutes;
}

function buildSummary(results: IBacktestResult[]): ISummary {
  if (!results || results.length === 0) {
    return null;
  }
  let totalGain = 0;
  let totalLoss = 0;
  let wins = 0;
  let losses = 0;
  let averageDurationMin = 0;
  let averageWinsDurationMin = 0;
  let averageLossesDurationMin = 0;

  for (const result of results) {
    const {tradeSetting} = result;
    const duration = dayjs(tradeSetting.whenClosed).diff(dayjs(tradeSetting.whenOpened), 'minute');
    averageDurationMin += duration;

    if (result.tradeSetting.gainLoss > 0) {
      totalGain += result.tradeSetting.gainLoss;
      wins++;
      averageWinsDurationMin += duration;
    } else {
      totalLoss += result.tradeSetting.gainLoss;
      losses++;
      averageLossesDurationMin += duration;
    }
  }
  averageDurationMin /= results.length;
  averageWinsDurationMin /= wins;
  averageLossesDurationMin /= losses;
  const whenOpened = dayjs(results[0].tradeSetting.whenOpened);
  const summary: ISummary = {
    totalGain,
    totalLoss,
    wins,
    losses,
    averageDurationMin,
    averageWinsDurationMin,
    averageLossesDurationMin,
    dayOfWeek: isoWeekdayNames[whenOpened.isoWeekday()],
    date: whenOpened.format('YYYY-MMM-DD'),
  };
  return summary;
}

export async function BacktestLoop(tradeSetting: ITradeSettings, ranges: IRanges): Promise<any[]> {
  const start = dayjs();
  if (!tradeSetting.prerunGainLimitValue) {
    throw new Error('BacktesingLoop: tradeSetting.prerunGainLimitValue must be set.');
  }
  const dataSet = [];
  // Get all the day's data for the backtest.
  for (let date: Dayjs = ranges.startDate; date.isBefore(ranges.endDate); date = date.add(1, 'day')) {
    const data = await GetHistoricalData(tradeSetting.userId, tradeSetting.symbol, date).catch((error) => {
    });
    dataSet.push(data || []);
  }
  const summaries = [];
  let totalTradeCount = 0;
  // Loop through all the parameters ranges and backtest against all the days desired.
  for (let gainLimit = ranges.startGain; gainLimit <= ranges.endGain; gainLimit += ranges.gainIncrement) {
    for (let lossLimit = ranges.startLoss; lossLimit <= ranges.endLoss; lossLimit += ranges.lossIncrement) {
      for (let seconds = ranges.startGainLimitPrerunAllowedDurationSeconds; seconds <= ranges.endGainLimitPrerunAllowedDurationSeconds; seconds += ranges.gainLimitPrerunAllowedDurationSecondsIncrement) {
        tradeSetting.gainLimit = gainLimit;
        tradeSetting.lossLimit = lossLimit;
        tradeSetting.prerunGainLimitValue.seconds = seconds;
        const results: IBacktestResult[] = [] as IBacktestResult[];
        for (let i = 0; i < dataSet.length; i++) {
          const data = dataSet[i];
          if (!data) {
            continue; // Skip this day (weekend or holiday).
          }
          let timeIndex = getStartIndex(tradeSetting);
          while (timeIndex < data.length) {
            let result: IBacktestResult = SingleCallPutBacktest(data, timeIndex, tradeSetting);
            // Save result to database.
            timeIndex = result.nextIndex;


            // Must add prerun check here and reset to prerun when appropriate.


            results.push(result);
          }
        }
        totalTradeCount += results.length;
        const summary = buildSummary(results);
        if (summary) {
          summaries.push(summary);
        }
      }
    }
  }
  const end = dayjs();
  console.log(`BacktestLoop: ${end.diff(start, 'second')} seconds, for ${totalTradeCount.toLocaleString()} results.`);
  return summaries;
}

export async function TestBackTestCode(): Promise<void> {
  const ranges: IRanges = {
    startGain: 1,
    endGain: 5,
    gainIncrement: 1,
    startLoss: 1,
    endLoss: 5,
    lossIncrement: 1,
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
  const results: IBacktestResult[] = await BacktestLoop(tradeSetting, ranges);
}