// @ts-ignore
import {Meteor} from "meteor/meteor";
import dayjs, {Dayjs} from 'dayjs';
import ITradeSettings, {
  DefaultIBacktestingData,
  DefaultTradeSettings,
  IBacktestResult
} from '../../imports/Interfaces/ITradeSettings';
import IRanges from '../../imports/Interfaces/IRanges';
import {GetHistoricalData} from '../TDAApi/TDAApi';
import {GetNewYorkTimeAt} from '../../imports/Utils';
import Constants from '../../imports/Constants';
import {BuySell, OptionType} from '../../imports/Interfaces/ILegSettings';
import {defaultPrerunGainLimitValue} from '../../imports/Interfaces/IPrerunGainLimitValue';
import {ExecuteTrade} from '../Trader';
import {DefaultClosedTradeInfo} from '../../imports/Interfaces/IClosedTradeInfo';
import {TradeSettings} from '../collections/TradeSettings';

const startOfTradeTime = GetNewYorkTimeAt(9, 30);

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
  gainIsDollar: boolean,
  lossIsDollar: boolean,
  prerunGainLimitSeconds: number,
  numberOfDaysTraded: number,
  isPrerunGainLimit: boolean,
  tradeType: OptionType,
  startDate: Date,
  endDate: Date,
}

function buildSummary(tradeSetting: ITradeSettings, results: IBacktestResult[], numberOfDaysTraded: number): ISummary {
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
    if (result.isAnyPrerun) {
      // Skip all prerun trades.
      continue;
    }
    totalNumberOfTrades++;
    const duration = dayjs(result.whenClosed).diff(dayjs(result.whenOpened), 'minute');
    averageDurationMin += duration;

    if (result.gainLoss > 0) {
      totalGain += result.gainLoss;
      wins++;
      averageWinsDurationMin += duration;
    } else {
      totalLoss += result.gainLoss;
      losses++;
      averageLossesDurationMin += duration;
    }
  }
  const tradeType = tradeSetting.legs[0].callPut;
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
    gainLimit: tradeSetting.percentGain,
    lossLimit: tradeSetting.percentLoss,
    gainIsDollar: tradeSetting.percentGainIsDollar,
    lossIsDollar: tradeSetting.percentLossIsDollar,
    isPrerunGainLimit: tradeSetting.isPrerunGainLimit,
    prerunGainLimitSeconds: tradeSetting.prerunGainLimitValue.seconds,
    numberOfDaysTraded,
    tradeType,
    startDate,
    endDate,
  };
  return summary;
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

export async function BackTestCallPut(ranges: IRanges): Promise<any> {
  try {
    const start = dayjs();
    const tradeSetting = TradeSettings.findOne(ranges.recordId);
    if (!tradeSetting.prerunGainLimitValue) {
      tradeSetting.prerunGainLimitValue = {...defaultPrerunGainLimitValue};
    }
    const dataSet = [];
    // Get all the day's data for the Backtest.
    for (let date: Dayjs = dayjs(ranges.startDate); date.isBefore(dayjs(ranges.endDate)); date = date.add(1, 'day')) {
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
              tradeSetting.percentGain = gainLimit;
              tradeSetting.percentLoss = lossLimit;
              tradeSetting.percentGainIsDollar = ranges.gainIsDollar;
              tradeSetting.percentLossIsDollar = ranges.lossIsDollar;
              tradeSetting.prerunGainLimitValue.seconds = seconds;
              tradeSetting.isBacktesting = true;
              tradeSetting.backtestingData = {...DefaultIBacktestingData, tradeType: tradeSetting.legs[0].callPut};

              console.log('Executing a backtesting run...');
              const resultsFromAllDaysTraded: IBacktestResult[] = [];
              // Loop for each day of data.
              for (let i = 0; i < dataSet.length; i++) {
                const minuteData = dataSet[i];
                if (!minuteData || minuteData.length === 0) {
                  continue; // Skip this day (weekend or holiday).
                }
                let timeIndex = getStartIndex(tradeSetting);
                const endIndex = Math.min(getEndIndex(tradeSetting), minuteData.length - 1);
                tradeSetting.backtestingData.index = timeIndex;
                tradeSetting.backtestingData.minuteData = minuteData;
                tradeSetting.backtestingData.results = [];
                const start = dayjs();
                let lastCloseTradeInfo = {...DefaultClosedTradeInfo};
                lastCloseTradeInfo.nowPrerunning = tradeSetting.isPrerun;
                lastCloseTradeInfo.nowPrerunningVIXSlope = tradeSetting.isPrerunVIXSlope;
                lastCloseTradeInfo.nowPrerunningGainLimit = tradeSetting.isPrerunGainLimit;

                // Loop to get all the trades for this day.
                do {
                  lastCloseTradeInfo = await ExecuteTrade(tradeSetting, false, lastCloseTradeInfo.nowPrerunning, lastCloseTradeInfo.nowPrerunningVIXSlope, lastCloseTradeInfo.nowPrerunningGainLimit);
                  if (lastCloseTradeInfo.isClosed) {
                    const tt = tradeSetting.whyClosed;
                  }
                } while (tradeSetting.isRepeat && tradeSetting.backtestingData.index < endIndex);
                resultsFromAllDaysTraded.push(...tradeSetting.backtestingData.results);
              }
              totalTradeCount += resultsFromAllDaysTraded.length;
              const summary: ISummary = buildSummary(tradeSetting, resultsFromAllDaysTraded, dataSet.length);
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
  } catch (error) {
    throw new Meteor.Error(error.message);
  }
}

export async function TestBackTestCode(): Promise<void> {
  const _id = 'backtestSettings';
  const ranges: IRanges = {
    recordId: _id,

    startGain: 0.1,
    endGain: 1,
    gainIncrement: 0.2,

    startLoss: 0.1,
    endLoss: 1,
    lossIncrement: 0.2,

    startGainLimitPrerunAllowedDurationSeconds: 180,
    endGainLimitPrerunAllowedDurationSeconds: 300,
    gainLimitPrerunAllowedDurationSecondsIncrement: 60,
    startDate: dayjs().subtract(10, 'day').hour(6).minute(0).toDate(),
    endDate: dayjs().hour(6).minute(0).toDate(),
    entryHours: [9],
    exitHours: [12],
    lossIsDollar: false,
    gainIsDollar: false,
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
    userName: 'Backtest test',
    symbol: Constants.SPXSymbol,
    entryHour: 9,
    entryMinute: 30,
    exitHour: 12,
    exitMinute: 0,
    percentGain: 0.01,
    percentLoss: 0.01,
    percentGainIsDollar: true,
    percentLossIsDollar: true,
    isPrerunGainLimit: true,
    isPrerunningGainLimit: false,
    prerunGainLimitValue: {
      seconds: 20,
    },
    legs: [...DefaultCallLegsSettings],
    isActive: true,
    isMocked: false,
    isRepeat: true,
  };

  tradeSetting.legs = [...DefaultPutLegsSettings];
  TradeSettings.upsert(_id, tradeSetting);
  let {sumText, summaries} = await BackTestCallPut(ranges);
  console.log(summaries[0]);
  console.log(sumText);

  tradeSetting.legs = [...DefaultCallLegsSettings];
  ({sumText, summaries} = await BackTestCallPut(ranges));
  console.log(summaries[0]);
  console.log(sumText);
}