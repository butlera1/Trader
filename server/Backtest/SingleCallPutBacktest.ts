import dayjs, {Dayjs} from 'dayjs';
import ITradeSettings, {
  DefaultIBacktestingData,
  DefaultTradeSettings,
  whyClosedEnum
} from '../../imports/Interfaces/ITradeSettings';
import IRanges from '../../imports/Interfaces/IRanges';
import ICandle from '../../imports/Interfaces/ICandle';
import {GetHistoricalData} from '../TDAApi/TDAApi';
import {GetNewYorkTimeAt} from '../../imports/Utils';
import Constants from '../../imports/Constants';
import {BuySell, OptionType} from '../../imports/Interfaces/ILegSettings';
import {defaultPrerunGainLimitValue} from '../../imports/Interfaces/IPrerunGainLimitValue';
import {ExecuteTrade} from '../Trader';

const startOfTradeTime = GetNewYorkTimeAt(9, 30);

interface IBacktestResult {
  nextIndex: number,
  tradeSetting: ITradeSettings,
}

interface ISummary {
  gainLossTotal: number,
  totalGain: number,
  totalLoss: number,
  wins: number,
  losses: number,
  winRate: number,
  lossRate: number,
  averageDurationMin: number,
  averageWinsDurationMin: number,
  averageLossesDurationMin: number,
  entryTime: string,
  exitTime: string,
  gainLimit: number,
  lossLimit: number,
  prerunGainLimitSeconds: number,
  numberOfDaysTraded: number,
  isPrerunGainLimit: boolean,
  tradeType: string,
  startDate: Date,
  endDate: Date,
}

function buildSummary(results: IBacktestResult[], numberOfDaysTraded: number): ISummary {
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
  let totalNumberOfTrades = 0;

  for (const result of results) {
    const {tradeSetting} = result;
    if (tradeSetting.isPrerunningGainLimit) {
      // Skip all prerun trades.
      continue;
    }
    totalNumberOfTrades++;
    const duration = dayjs(tradeSetting.whenClosed).diff(dayjs(tradeSetting.whenOpened), 'minute');
    averageDurationMin += duration;

    if (tradeSetting.gainLoss > 0) {
      totalGain += tradeSetting.gainLoss;
      wins++;
      averageWinsDurationMin += duration;
    } else {
      totalLoss += tradeSetting.gainLoss;
      losses++;
      averageLossesDurationMin += duration;
    }
  }
  const tradeSetting = results[0].tradeSetting;
  const tradeType = results[0].tradeSetting.legs[0].callPut;
  averageDurationMin /= totalNumberOfTrades;
  averageWinsDurationMin /= wins;
  averageLossesDurationMin /= losses;
  const startDate = dayjs().subtract(numberOfDaysTraded, 'day').toDate();
  const endDate = dayjs().subtract(1, 'day').toDate();
  const summary: ISummary = {
    gainLossTotal: totalGain + totalLoss,
    totalGain,
    totalLoss,
    wins,
    losses,
    winRate: wins / totalNumberOfTrades,
    lossRate: losses / totalNumberOfTrades,
    averageDurationMin,
    averageWinsDurationMin,
    averageLossesDurationMin,
    entryTime: tradeSetting.entryHour + ':' + tradeSetting.entryMinute,
    exitTime: tradeSetting.exitHour + ':' + tradeSetting.exitMinute,
    gainLimit: tradeSetting.gainLimit,
    lossLimit: tradeSetting.lossLimit,
    isPrerunGainLimit: tradeSetting.isPrerunGainLimit,
    prerunGainLimitSeconds: tradeSetting.prerunGainLimitValue.seconds,
    numberOfDaysTraded,
    tradeType,
    startDate,
    endDate,
  };
  return summary;
}

function checkForLossAndSet(lowPositive, tradeSetting: ITradeSettings): boolean {
  if (lowPositive >= tradeSetting.lossLimit) {
    tradeSetting.whyClosed = whyClosedEnum.lossLimit;
    tradeSetting.gainLoss = -tradeSetting.lossLimit;
    return true;
  }
  return false;
}

function checkForGainAndSet(highPositive, tradeSetting: ITradeSettings): boolean {
  if (highPositive >= tradeSetting.gainLimit) {
    tradeSetting.whyClosed = whyClosedEnum.gainLimit;
    tradeSetting.gainLoss = tradeSetting.gainLimit;
    return true;
  }
  return false;
}

function seeIfTradeIsClosed(tradeSetting: ITradeSettings, data: ICandle, isCall): void {
  const checkLowFirst = Math.random() > 0.5;
  const openingPrice = tradeSetting.openingPrice;
  // Calculate potential loss and potential gain for a CALL.
  let potentialLossPositive = data.low < openingPrice ? openingPrice - data.low : 0;
  let potentialGainPositive = data.high > openingPrice ? data.high - openingPrice : 0;
  if (!isCall) {
    // If PUT, then reverse the loss and gain.
    const tempGain = potentialGainPositive;
    potentialGainPositive = potentialLossPositive;
    potentialLossPositive = tempGain;
  }
  if (checkLowFirst) {
    if (checkForLossAndSet(potentialLossPositive, tradeSetting)) {
    } else {
      checkForGainAndSet(potentialGainPositive, tradeSetting);
    }
  } else {
    if (checkForGainAndSet(potentialGainPositive, tradeSetting)) {
    } else {
      checkForLossAndSet(potentialLossPositive, tradeSetting);
    }
  }
}

function SingleCallPutBacktest(data: [ICandle], index: number, tradeSetting: ITradeSettings, endIndex: number): IBacktestResult {
  // Start trade.
  tradeSetting.whenOpened = new Date(data[index].datetime);
  tradeSetting.openingPrice = data[index].open;
  tradeSetting.gainLoss = 0;
  delete tradeSetting.whyClosed;
  const isCall = tradeSetting.legs[0].callPut === OptionType.CALL;
  while (index < endIndex && !tradeSetting.whyClosed) {
    seeIfTradeIsClosed(tradeSetting, data[index], isCall);
    index++;
  }

  // If we didn't close the trade, then we need to close it at the end of the day.
  if (!tradeSetting.whyClosed) {
    tradeSetting.whyClosed = whyClosedEnum.timedExit;
    tradeSetting.gainLoss = data[index - 1].close - tradeSetting.openingPrice;
  }
  tradeSetting.whenClosed = new Date(data[index - 1].datetime);
  const durationSeconds = dayjs(tradeSetting.whenClosed).diff(dayjs(tradeSetting.whenOpened), 'second');
  const wasIsPrerunningGainLimit = tradeSetting.isPrerunningGainLimit;
  if (
    tradeSetting.isPrerunningGainLimit &&
    tradeSetting.whyClosed === whyClosedEnum.gainLimit &&
    durationSeconds <= tradeSetting.prerunGainLimitValue.seconds
  ) {
    tradeSetting.whyClosed = whyClosedEnum.prerunGainLimitExit;
    tradeSetting.isPrerunningGainLimit = false; // Turn it off since we got a good gain in time.
  }

  // If the trade did not make a gain, switch back to prerun gain limit mode if it is on.
  tradeSetting.isPrerunningGainLimit = (tradeSetting.gainLoss <= 0 && tradeSetting.isPrerunGainLimit);

  // return trade result as a copy so results are all unique objects.
  const copyTradeSetting = {...tradeSetting, isPrerunningGainLimit: wasIsPrerunningGainLimit, prerunGainLimitValue: {...tradeSetting.prerunGainLimitValue}};

  return {nextIndex: index, tradeSetting: copyTradeSetting};
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

const maxSummaries = 50;

function addSummaryToSummaries(summary: ISummary, summaries: ISummary[]) {
  let index = 0;
  while (index < summaries.length && summaries[index].gainLossTotal > summary.gainLossTotal) {
    index++;
  }
  summaries.splice(index, 0, summary);

  while (summaries.length > maxSummaries) {
    summaries.pop();
  }
}

export async function BacktestLoop(tradeSetting: ITradeSettings, ranges: IRanges): Promise<any> {
  const start = dayjs();
  if (!tradeSetting.prerunGainLimitValue) {
    tradeSetting.prerunGainLimitValue = {...defaultPrerunGainLimitValue};
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
  for (let entryHourIndex = 0; entryHourIndex < ranges.entryHours.length; entryHourIndex++) {
    const entryHour = ranges.entryHours[entryHourIndex];
    for (let exitHourIndex = 0; exitHourIndex < ranges.exitHours.length; exitHourIndex++) {
      const exitHour = ranges.exitHours[exitHourIndex];
      if (exitHour < entryHour) {
        continue;
      }
      tradeSetting.entryHour = entryHour;
      tradeSetting.exitHour = exitHour;
      // Loop through all the parameters ranges and back test against all the days desired.
      for (let gainLimit = ranges.startGain; gainLimit <= ranges.endGain; gainLimit += ranges.gainIncrement) {
        for (let lossLimit = ranges.startLoss; lossLimit <= ranges.endLoss; lossLimit += ranges.lossIncrement) {
          for (let seconds = ranges.startGainLimitPrerunAllowedDurationSeconds; seconds <= ranges.endGainLimitPrerunAllowedDurationSeconds; seconds += ranges.gainLimitPrerunAllowedDurationSecondsIncrement) {
            tradeSetting.gainLimit = gainLimit;
            tradeSetting.lossLimit = lossLimit;
            tradeSetting.prerunGainLimitValue.seconds = seconds;
            tradeSetting.isPrerunningGainLimit = tradeSetting.isPrerunGainLimit;
            const results: IBacktestResult[] = [] as IBacktestResult[];
            for (let i = 0; i < dataSet.length; i++) {
              const minuteData = dataSet[i];
              if (!minuteData) {
                continue; // Skip this day (weekend or holiday).
              }
              let timeIndex = getStartIndex(tradeSetting);
              const endIndex = Math.min(getEndIndex(tradeSetting) + 1, minuteData.length);
              tradeSetting.backtestingData = { ...DefaultIBacktestingData, index: timeIndex, minuteData};
              // Loop to get all the trades for this day.
              while (timeIndex < endIndex) {
                await ExecuteTrade(tradeSetting, false, tradeSetting.isPrerun, tradeSetting.isPrerunVIXSlope, tradeSetting.isPrerunningGainLimit);
                let daysResults: IBacktestResult = SingleCallPutBacktest(minuteData, timeIndex, tradeSetting, endIndex);
                timeIndex = daysResults.nextIndex;
                results.push(daysResults);
              }
            }
            totalTradeCount += results.length;
            const summary = buildSummary(results, dataSet.length);
            if (summary) {
              addSummaryToSummaries(summary, summaries);
            }
          }
        }
      }
    }
  }

  const end = dayjs();
  const sumText = `BacktestLoop: ${end.diff(start, 'second')} seconds, for ${totalTradeCount.toLocaleString()} results.`;
  return {sumText, summaries};
}

export async function TestBackTestCode(): Promise<void> {

  const ranges: IRanges = {
    recordId: 'test',
    startGain: 0.01,
    endGain: 1,
    gainIncrement: 0.2,
    startLoss: 0.01,
    endLoss: 1,
    lossIncrement: 0.2,
    startGainLimitPrerunAllowedDurationSeconds: 180,
    endGainLimitPrerunAllowedDurationSeconds: 300,
    gainLimitPrerunAllowedDurationSecondsIncrement: 60,
    startDate: dayjs().subtract(10, 'day'),
    endDate: dayjs().subtract(1, 'day'),
    entryHours: [9],
    exitHours: [10],
  };
  const DefaultCallLegsSettings = [
    {
      buySell: BuySell.BUY,
      callPut: OptionType.CALL,
      delta: 0.5,
      dte: 0,
      quantity: 1,
    },
  ];

  const DefaultPutLegsSettings = [
    {
      buySell: BuySell.BUY,
      callPut: OptionType.PUT,
      delta: 0.5,
      dte: 0,
      quantity: 1,
    },
  ];

  const tradeSetting: ITradeSettings = {
    ...DefaultTradeSettings,
    userId: 'g7gpWRiEBDqjysDFQ',
    symbol: Constants.SPXSymbol,
    entryHour: 9,
    entryMinute: 30,
    exitHour: 11,
    exitMinute: 55,
    gainLimit: 0.1,
    lossLimit: 0.1,
    isPrerunGainLimit: true,
    isPrerunningGainLimit: false,
    prerunGainLimitValue: {
      seconds: 20,
    },
    legs: [...DefaultCallLegsSettings],
  };

  tradeSetting.legs = [...DefaultPutLegsSettings];
  let {sumText, summaries} = await BacktestLoop(tradeSetting, ranges);
  console.log(summaries[0]);
  console.log(sumText);

  tradeSetting.legs = [...DefaultCallLegsSettings];
  ({sumText, summaries} = await BacktestLoop(tradeSetting, ranges));
  console.log(summaries[0]);
  console.log(sumText);
}