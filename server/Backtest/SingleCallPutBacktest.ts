import {Meteor} from "meteor/meteor";
import dayjs, {Dayjs} from 'dayjs';
import ITradeSettings, {
  DefaultIBacktestingData,
  DefaultIPrice,
  DefaultTradeSettings,
  IBacktestResult,
  IPrice
} from '../../imports/Interfaces/ITradeSettings';
import IRanges from '../../imports/Interfaces/IRanges';
import {GetHistoricalData} from '../TDAApi/TDAApi';
import {GetNewYorkTimeAt} from '../../imports/Utils';
import Constants from '../../imports/Constants';
import {BuySell, OptionType} from '../../imports/Interfaces/ILegSettings';
import {defaultPrerunGainLimitValue} from '../../imports/Interfaces/IPrerunGainLimitValue';
import {CheckForTradeCompletion, IsTradeReadyToRun, PrepareTradeForStartOfTrade} from '../Trader';
import {DefaultClosedTradeInfo, IClosedTradeInfo} from '../../imports/Interfaces/IClosedTradeInfo';
import {TradeSettings} from '../collections/TradeSettings';
import {BacktestTrades} from '../collections/BacktestTrades';
import {LogData} from "../collections/Logs.ts";
import ICandle from "../../imports/Interfaces/ICandle.ts";
import ITradeSettingsSet from "../../imports/Interfaces/ITradeSettingsSet.ts";
import {GetTradeSettingsFromSet} from "../collections/TradeSettings.js";
import {TradeSettingsSets} from "../collections/TradeSettingsSets.ts";

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
  if (!results || results.length===0) {
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

function nextBacktestPrice(tradeSettings: ITradeSettings): IPrice {
  // This approach in backtesting only uses the close value and not the HIGH / LOW range in any way.
  const {minuteData, index} = tradeSettings.backtestingData;
  const price: IPrice = {
    ...DefaultIPrice,
    price: minuteData[index].close,
    whenNY: new Date(minuteData[index].datetime)
  };
  tradeSettings.backtestingData.index++;
  if (tradeSettings.backtestingData.tradeType===OptionType.CALL) {
    price.price = -price.price; // Flip since we are long the trade else leave as positive for PUT.
  }
  return price;
}

async function backTestLoop(tradeSettings: ITradeSettings): Promise<IClosedTradeInfo> {
  let closeTradeInfo: IClosedTradeInfo = {...DefaultClosedTradeInfo};
  const exitTime = GetNewYorkTimeAt(tradeSettings.exitHour, tradeSettings.exitMinute);
  let currentSample: IPrice = tradeSettings.monitoredPrices[0];
  if (tradeSettings.backtestingData.tradeType===OptionType.PUT) {
    currentSample.price = Math.abs(tradeSettings.openingPrice);
  }
  do {
    closeTradeInfo = await CheckForTradeCompletion(tradeSettings, currentSample, exitTime);
    if (closeTradeInfo.isClosed) {
      tradeSettings.backtestingData.index++; // Move to next sample for next trade loop if any.
    } else {
      // Get next price for the trade.
      currentSample = nextBacktestPrice(tradeSettings);
      tradeSettings.monitoredPrices.push(currentSample);
    }
  } while (closeTradeInfo.isClosed===false);
  return closeTradeInfo;
}

async function loadHistoricalData(ranges: IRanges, userId: string, symbol: string){
  const dataSet = [];
  // Get all the day's data for the Backtest.
  for (let date: Dayjs = dayjs(ranges.startDate); date.isBefore(dayjs(ranges.endDate)); date = date.add(1, 'day')) {
    const data = await GetHistoricalData(userId, symbol, date).catch((error) => {
    });
    dataSet.push(data || []);
  }
  return dataSet;
}

async function backtestExecuteTradePerDay(tradeSetting: ITradeSettings){
  const minuteData = tradeSetting.backtestingData.minuteData;
  let timeIndex = getStartIndex(tradeSetting);
  const endIndex = Math.min(getEndIndex(tradeSetting), minuteData.length - 1);
  tradeSetting.backtestingData.index = timeIndex;
  tradeSetting.backtestingData.minuteData = minuteData;
  tradeSetting.backtestingData.results = [];
  let lastCloseTradeInfo = {...DefaultClosedTradeInfo};
  lastCloseTradeInfo.nowPrerunning = tradeSetting.isPrerun;
  lastCloseTradeInfo.nowPrerunningVIXSlope = tradeSetting.isPrerunVIXSlope;
  lastCloseTradeInfo.nowPrerunningGainLimit = tradeSetting.isPrerunGainLimit;

  // Loop to get all the trades for this day.
  do {
    const isTradeReadyToRun = IsTradeReadyToRun(tradeSetting, false, lastCloseTradeInfo.nowPrerunning, lastCloseTradeInfo.nowPrerunningVIXSlope, lastCloseTradeInfo.nowPrerunningGainLimit)
    if (isTradeReadyToRun) {
      // Set the opening price to the open price of the current minute data (means long the trade).
      const {minuteData, index} = tradeSetting.backtestingData;
      tradeSetting.openingPrice = minuteData[index].open;
      tradeSetting.csvSymbols = Constants.SPXSymbol;
      tradeSetting.openingShortOnlyPrice = 0;
      tradeSetting.whenOpened = new Date(minuteData[index].datetime);
      if (tradeSetting.backtestingData.tradeType === OptionType.PUT) {
        // If PUT, then openingPrice is flipped since PUT implies short.
        tradeSetting.openingPrice = -tradeSetting.openingPrice;
      }
      // Perform all trades for the current day (attached to the tradeSetting object).
      const oldPercentGain = tradeSetting.percentGain;
      const oldPercentLoss = tradeSetting.percentLoss;
      // Adjusting the percentGain and percentLoss based on DELTA value of the trade.
      tradeSetting.percentGain = tradeSetting.percentGain * tradeSetting.backtestingData.delta;
      tradeSetting.percentLoss = tradeSetting.percentLoss * tradeSetting.backtestingData.delta;
      PrepareTradeForStartOfTrade(tradeSetting);
      tradeSetting.percentGain = oldPercentGain;
      tradeSetting.percentLoss = oldPercentLoss;
      lastCloseTradeInfo = await backTestLoop(tradeSetting).catch(reason => {
        LogData(tradeSetting, `Failed backTestLoop ${reason}`, new Error(reason));
        return {...DefaultClosedTradeInfo, isClosed: true, isRepeat: false};
      });
    }
  } while (tradeSetting.isRepeat && tradeSetting.backtestingData.index < endIndex);

}

export async function BackTestCallPut(ranges: IRanges, dataSet: ICandle[][]): Promise<any> {
  try {
    const start = dayjs();
    const tradeSetting = TradeSettings.findOne(ranges.tradeSettingsSetId);
    BacktestTrades.remove({userId: tradeSetting.userId});
    if (!tradeSetting.prerunGainLimitValue) {
      tradeSetting.prerunGainLimitValue = {...defaultPrerunGainLimitValue};
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
        // Loop through all the parameters ranges and back test against all the days desired.
        for (let gainLimit = ranges.startGain; gainLimit <= ranges.endGain; gainLimit += ranges.gainIncrement) {
          for (let lossLimit = ranges.startLoss; lossLimit <= ranges.endLoss; lossLimit += ranges.lossIncrement) {
            for (let seconds = ranges.startGainLimitPrerunAllowedDurationSeconds; seconds <= ranges.endGainLimitPrerunAllowedDurationSeconds; seconds += ranges.gainLimitPrerunAllowedDurationSecondsIncrement) {
              tradeSetting.percentGain = gainLimit;
              tradeSetting.percentLoss = lossLimit;
              tradeSetting.entryHour = entryHour;
              tradeSetting.exitHour = exitHour;
              tradeSetting.percentGainIsDollar = ranges.gainIsDollar;
              tradeSetting.percentLossIsDollar = ranges.lossIsDollar;
              tradeSetting.prerunGainLimitValue.seconds = seconds;
              tradeSetting.isBacktesting = true;
              // Define backtestingData within the tradeSetting object.
              const tradeLeg = tradeSetting.legs[0];
              tradeSetting.backtestingData = {
                ...DefaultIBacktestingData,
                tradeType: tradeLeg.callPut,
                delta: tradeLeg.delta
              };

              const resultsFromAllDaysTraded: IBacktestResult[] = [];
              const startDaysLoopTimer = dayjs();
              // Loop for each day of data.
              for (let i = 0; i < dataSet.length; i++) {
                const minuteData = dataSet[i];
                if (!minuteData || minuteData.length===0) {
                  continue; // Skip this day (weekend or holiday).
                }

                // Assign historical minute data to backtestingData within the tradeSetting object.
                let timeIndex = getStartIndex(tradeSetting);
                const endIndex = Math.min(getEndIndex(tradeSetting), minuteData.length - 1);
                tradeSetting.backtestingData.index = timeIndex;
                tradeSetting.backtestingData.minuteData = minuteData;
                tradeSetting.backtestingData.results = [];
                let lastCloseTradeInfo = {...DefaultClosedTradeInfo};
                lastCloseTradeInfo.nowPrerunning = tradeSetting.isPrerun;
                lastCloseTradeInfo.nowPrerunningVIXSlope = tradeSetting.isPrerunVIXSlope;
                lastCloseTradeInfo.nowPrerunningGainLimit = tradeSetting.isPrerunGainLimit;

                // Loop to get all the trades for this day.
                do {
                  const isTradeReadyToRun = IsTradeReadyToRun(tradeSetting, false, lastCloseTradeInfo.nowPrerunning, lastCloseTradeInfo.nowPrerunningVIXSlope, lastCloseTradeInfo.nowPrerunningGainLimit)
                  if (isTradeReadyToRun) {
                    // Set the opening price to the open price of the current minute data (means long the trade).
                    const {minuteData, index} = tradeSetting.backtestingData;
                    tradeSetting.openingPrice = minuteData[index].open;
                    tradeSetting.csvSymbols = Constants.SPXSymbol;
                    tradeSetting.openingShortOnlyPrice = 0;
                    tradeSetting.whenOpened = new Date(minuteData[index].datetime);
                    if (tradeSetting.backtestingData.tradeType === OptionType.PUT) {
                      // If PUT, then openingPrice is flipped since PUT implies short.
                      tradeSetting.openingPrice = -tradeSetting.openingPrice;
                    }
                    // Perform all trades for the current day (attached to the tradeSetting object).
                    const oldPercentGain = tradeSetting.percentGain;
                    const oldPercentLoss = tradeSetting.percentLoss;
                    // Adjusting the percentGain and percentLoss based on DELTA value of the trade.
                    tradeSetting.percentGain = tradeSetting.percentGain * tradeSetting.backtestingData.delta;
                    tradeSetting.percentLoss = tradeSetting.percentLoss * tradeSetting.backtestingData.delta;
                    PrepareTradeForStartOfTrade(tradeSetting);
                    tradeSetting.percentGain = oldPercentGain;
                    tradeSetting.percentLoss = oldPercentLoss;
                    lastCloseTradeInfo = await backTestLoop(tradeSetting).catch(reason => {
                      LogData(tradeSetting, `Failed backTestLoop ${reason}`, new Error(reason));
                      return {...DefaultClosedTradeInfo, isClosed: true, isRepeat: false};
                    });
                  }
                } while (tradeSetting.isRepeat && tradeSetting.backtestingData.index < endIndex);
                // tradeSetting now holds all the trades for this day and the day's settings.
                resultsFromAllDaysTraded.push(...tradeSetting.backtestingData.results);
              }
              // console.log(`Backtest ${dataSet.length} Day${dataSet.length > 1 ? 's' : ''} Loop: ${dayjs().diff(startDaysLoopTimer, 'second')} seconds, for ${resultsFromAllDaysTraded.length.toLocaleString()} results.`);
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

async function BacktestTradeSetMethod(ranges: IRanges) {
  const tradesSet: ITradeSettingsSet = TradeSettingsSets.findOne(ranges.tradeSettingsSetId);
  const dataSet = await loadHistoricalData(ranges, tradesSet.userId, Constants.SPXSymbol);
  for (let i = 0; i < tradesSet.tradeSettingIds.length; i++) {
    ranges.tradeSettingsSetId = tradesSet.tradeSettingIds[i];
    let {sumText, summaries} = await BackTestCallPut(ranges, dataSet);
    console.log(summaries[0]);
    console.log(sumText);
  }
}

async function TestBackTestCode(): Promise<void> {
  const _id = 'backtestSettings';
  const ranges: IRanges = {
    tradeSettingsSetId: _id,

    startGain: 1.0,
    endGain: 10,
    gainIncrement: 2,
    gainIsDollar: true,

    startLoss: 1,
    endLoss: 10,
    lossIncrement: 2,
    lossIsDollar: true,

    startGainLimitPrerunAllowedDurationSeconds: 180,
    endGainLimitPrerunAllowedDurationSeconds: 180,
    gainLimitPrerunAllowedDurationSecondsIncrement: 60,
    startDate: dayjs().subtract(1, 'day').hour(6).minute(0).toDate(),
    endDate: dayjs().hour(6).minute(0).toDate(),
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

  const dataSet = await loadHistoricalData(ranges, tradeSetting.userId, tradeSetting.symbol);

  tradeSetting.legs = [...DefaultPutLegsSettings];
  TradeSettings.upsert(_id, tradeSetting);
  console.log('Starting backtesting.');
  let {sumText, summaries} = await BackTestCallPut(ranges, dataSet);
  console.log(summaries[0]);
  console.log(sumText);

  tradeSetting.legs = [...DefaultCallLegsSettings];
  ({sumText, summaries} = await BackTestCallPut(ranges, dataSet));
  console.log(summaries[0]);
  console.log(sumText);
}

export {
  TestBackTestCode,
  BacktestTradeSetMethod,
}