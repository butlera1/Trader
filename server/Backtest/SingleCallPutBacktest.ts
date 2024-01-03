import {Meteor} from "meteor/meteor";
import dayjs, {Dayjs} from 'dayjs';
import ITradeSettings, {
  DefaultIBacktestingData,
  DefaultIBacktestSummary,
  DefaultIPrice,
  DefaultTradeSettings,
  IBacktestingData,
  IBacktestSummary,
  IPrice
} from '../../imports/Interfaces/ITradeSettings';
import IRanges, {GetDefaultRanges} from '../../imports/Interfaces/IRanges';
import {GetHistoricalData} from '../TDAApi/TDAApi';
import {AnyPrerunningOn, GetNewYorkTimeAt} from '../../imports/Utils';
import Constants from '../../imports/Constants';
import {BuySell, OptionType} from '../../imports/Interfaces/ILegSettings';
import {defaultPrerunGainLimitValue} from '../../imports/Interfaces/IPrerunGainLimitValue';
import {CheckForTradeCompletion, IsTradeReadyToRun, PrepareTradeForStartOfTrade} from '../Trader';
import {DefaultClosedTradeInfo, IClosedTradeInfo} from '../../imports/Interfaces/IClosedTradeInfo';
import {TradeSettings} from '../collections/TradeSettings';
import {LogData} from "../collections/Logs.ts";
import ICandle from "../../imports/Interfaces/ICandle.ts";
import ITradeSettingsSet from "../../imports/Interfaces/ITradeSettingsSet.ts";
import {TradeSettingsSets} from "../collections/TradeSettingsSets.ts";
import {Backtests} from "../collections/Backtests.js";
import {Random} from 'meteor/random';
import {IAppSettings} from "../../imports/Interfaces/IAppSettings.ts";
import {AppSettings} from "../collections/AppSettings.js";
import {DefaultIBacktest} from "../../imports/Interfaces/IBacktest.ts";
import {PrepareDailyTradeSummariesFor} from "../collections/DailyTradeSummaries.ts";

const startOfTradeTime = GetNewYorkTimeAt(9, 30);


function calculateSummary(backtestSummary: IBacktestSummary) {
  if (!backtestSummary || backtestSummary.resultsPerDay.length===0) {
    return;
  }
  let totalGain = 0;
  let totalLoss = 0;
  let wins = 0;
  let losses = 0;
  let averageDurationMin = 0;
  let averageWinsDurationMin = 0;
  let averageLossesDurationMin = 0;
  let totalNumberOfTrades = 0;
  let countOfWinningDays = 0;
  const weekDayWinRates = [0, 0, 0, 0, 0, 0, 0];
  const weekDayTotalCounts = [0, 0, 0, 0, 0, 0, 0];

  // Loop through each day's trades.
  for (const dayResult of backtestSummary.resultsPerDay) {
    let dailyTotalGainLoss = 0;
    for (const tradeId of dayResult.trades) {
      const trade = Backtests.findOne(tradeId);
      if (!trade) {
        console.error(`BacktestSummary failed to find tradeId: ${tradeId}`);
        continue
      }
      if (AnyPrerunningOn(trade)) {
        // Skip all prerun trades.
        continue;
      }
      totalNumberOfTrades++;
      const duration = dayjs(trade.whenClosed).diff(dayjs(trade.whenOpened), 'minute');
      averageDurationMin += duration;

      dailyTotalGainLoss += trade.gainLoss;
      totalGain += trade.gainLoss;
      if (trade.gainLoss > 0) {
        wins++;
        averageWinsDurationMin += duration;
      } else {
        losses++;
        averageLossesDurationMin += duration;
      }
    }
    weekDayTotalCounts[dayResult.when.getDay()]++;
    if (dailyTotalGainLoss > 0) {
      countOfWinningDays++;
      weekDayWinRates[dayResult.when.getDay()]++;
    }
  }

  averageDurationMin /= totalNumberOfTrades;
  averageWinsDurationMin /= wins;
  averageLossesDurationMin /= losses;
  backtestSummary.gainLossTotal = totalGain + totalLoss;
  backtestSummary.totalGain = totalGain;
  backtestSummary.totalLoss = totalLoss;
  backtestSummary.wins = wins;
  backtestSummary.losses = losses;
  backtestSummary.winRate = wins / totalNumberOfTrades;
  backtestSummary.lossRate = losses / totalNumberOfTrades;
  backtestSummary.averageDurationMin = averageDurationMin;
  backtestSummary.averageWinsDurationMin = averageWinsDurationMin;
  backtestSummary.averageLossesDurationMin = averageLossesDurationMin;
  backtestSummary.dailyWinRate = countOfWinningDays / backtestSummary.resultsPerDay.length;
  for (let i = 0; i < weekDayTotalCounts.length; i++) {
    if (weekDayTotalCounts[i] > 0) {
      weekDayWinRates[i] /= weekDayTotalCounts[i];}
  }
  backtestSummary.mondayWinRate = weekDayWinRates[1];
  backtestSummary.tuesdayWinRate = weekDayWinRates[2];
  backtestSummary.wednesdayWinRate = weekDayWinRates[3];
  backtestSummary.thursdayWinRate = weekDayWinRates[4];
  backtestSummary.fridayWinRate = weekDayWinRates[5];
}

function getStartIndex(tradeSetting: ITradeSettings): number {
  const startTrade = GetNewYorkTimeAt(tradeSetting.entryHour, tradeSetting.entryMinute);
  const minutes = startTrade.diff(startOfTradeTime, 'minute');
  return minutes;
}

function getEndIndex(tradeSetting: ITradeSettings): number {
  const endTrade = GetNewYorkTimeAt(tradeSetting.exitHour, tradeSetting.exitMinute);
  const minutes = endTrade.diff(startOfTradeTime, 'minute');
  return minutes;
}

const maxSummaries = 50;

function addSummaryToSummaries(summary: IBacktestSummary, summaries: IBacktestSummary[]) {
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

async function backTestLoop(tradeSettings: ITradeSettings, allTradesForOneDay: string[]): Promise<IClosedTradeInfo> {
  let closeTradeInfo: IClosedTradeInfo = {...DefaultClosedTradeInfo};
  const exitTime = GetNewYorkTimeAt(tradeSettings.exitHour, tradeSettings.exitMinute);
  let currentSample: IPrice = tradeSettings.monitoredPrices[0];
  if (tradeSettings.backtestingData.tradeType===OptionType.PUT) {
    currentSample.price = Math.abs(tradeSettings.openingPrice);
  }
  do {
    closeTradeInfo = await CheckForTradeCompletion(tradeSettings, currentSample, exitTime).catch(reason => {
      LogData(tradeSettings, `Failed CheckForTradeCompletion inside backTestLoop ${reason}`, new Error(reason));
      return {...DefaultClosedTradeInfo, isClosed: true, isRepeat: false};
    });
    if (closeTradeInfo.isClosed) {
      // BacktestingData is doing math on one contract so here we scale it up to the TradeSetting's leg's quantity.
      tradeSettings.gainLoss = Math.trunc(tradeSettings.gainLoss);
      tradeSettings._id = Random.id();
      const holdBacktestingData: IBacktestingData = tradeSettings.backtestingData;
      delete tradeSettings.backtestingData;
      const idResult = Backtests.insert(tradeSettings);
      allTradesForOneDay.push(tradeSettings._id);
      tradeSettings.backtestingData = holdBacktestingData;
      // Move to next sample for next trade loop if any.
      tradeSettings.backtestingData.index++;
    } else {
      // Get next price for the trade.
      currentSample = nextBacktestPrice(tradeSettings);
      tradeSettings.monitoredPrices.push(currentSample);
    }
  } while (closeTradeInfo.isClosed===false);
  return closeTradeInfo;
}

async function loadHistoricalData(ranges: IRanges, userId: string, symbol: string) {
  const dataSet = [];
  const start = dayjs(ranges.startDate);
  const end = dayjs(ranges.endDate);
  const daysCount = end.diff(start, 'day') + 1;

  Backtests.upsert({_id: userId}, {$set: {isLoadingHistoricalData: true}});

  // Get all the day's data for the Backtest.
  for (let date: Dayjs = start; date.isBefore(end); date = date.add(1, 'day')) {
    const loadingHistoricalData = `Loading historical data for ${symbol} on ${date.format('YYYY-MM-DD')}: ${dataSet.length + 1}/${daysCount}`;
    Backtests.upsert({_id: userId}, {$set: {loadingHistoricalData}});
    const data = await GetHistoricalData(userId, symbol, date).catch((error) => {
      console.error(`GetHistoricalData failed with: ${error.message}`, error);
      throw error;
    });
    dataSet.push(data || []);
  }
  const loadingHistoricalData = `Loaded historical data for ${symbol}: ${dataSet.length}/${daysCount}`;
  Backtests.upsert({_id: userId}, {$unset: {isLoadingHistoricalData: ''}});
  Backtests.upsert({_id: userId}, {$set: {loadingHistoricalData}});
  return dataSet;
}

async function mainBacktestTradeLoop(tradeSetting: ITradeSettings, allTradesForOneDay: string[]) {
  // Assign historical minute data to backtestingData within the tradeSetting object.
  const endIndex = Math.min(getEndIndex(tradeSetting), tradeSetting.backtestingData.minuteData.length - 1);
  tradeSetting.backtestingData.index = getStartIndex(tradeSetting);

  let lastCloseTradeInfo = {...DefaultClosedTradeInfo};
  lastCloseTradeInfo.nowPrerunning = tradeSetting.isPrerun;
  lastCloseTradeInfo.nowPrerunningVIXSlope = tradeSetting.isPrerunVIXSlope;
  lastCloseTradeInfo.nowPrerunningGainLimit = tradeSetting.isPrerunGainLimit;

  // Loop to get all the trades for this day with this one tradeSetting.
  do {
    const isTradeReadyToRun = IsTradeReadyToRun(tradeSetting, false, lastCloseTradeInfo.nowPrerunning, lastCloseTradeInfo.nowPrerunningVIXSlope, lastCloseTradeInfo.nowPrerunningGainLimit);
    if (isTradeReadyToRun) {
      // Set the opening price to the open price of the current minute data (means long the trade).
      const {minuteData, index} = tradeSetting.backtestingData;
      tradeSetting.openingPrice = minuteData[index].open;
      tradeSetting.csvSymbols = Constants.SPXSymbol;
      tradeSetting.openingShortOnlyPrice = 0;
      tradeSetting.whenOpened = new Date(minuteData[index].datetime);
      if (tradeSetting.backtestingData.tradeType===OptionType.PUT) {
        // If PUT, then openingPrice is flipped since PUT implies short (i.e. credit received).
        tradeSetting.openingPrice = -tradeSetting.openingPrice;
      }
      // Perform all trades for the current day (attached to the tradeSetting object).
      PrepareTradeForStartOfTrade(tradeSetting);
      lastCloseTradeInfo = await backTestLoop(tradeSetting, allTradesForOneDay).catch(reason => {
        LogData(tradeSetting, `Failed backTestLoop ${reason}`, new Error(reason));
        return {...DefaultClosedTradeInfo, isClosed: true, isRepeat: false};
      });
    } else {
      // Could be that we hit daily gain or loss limit.
      tradeSetting.backtestingData.index = endIndex; // Force exit of the loop.
    }
  } while (tradeSetting.isRepeat && tradeSetting.backtestingData.index < endIndex);
}

export async function BackTestCallPut(ranges: IRanges, dataSet: ICandle[][], tradeSettingsArray: ITradeSettings[], userId: string): Promise<any> {
  try {
    const start = dayjs();
    const summaries: IBacktestSummary[] = [];
    let totalTradesCount = 0;
    ranges.estimatedDaysCount = 0;
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
            for (let seconds = ranges.startGainLimitPrerunAllowedDurationSeconds;
                 seconds <= ranges.endGainLimitPrerunAllowedDurationSeconds;
                 seconds += ranges.gainLimitPrerunAllowedDurationSecondsIncrement) {
              const backTestPatternSummary: IBacktestSummary = {
                ...DefaultIBacktestSummary,
                key: Random.id(),
                startDate: ranges.startDate,
                endDate: ranges.endDate,
                entryHour,
                exitHour,
                gainLimit,
                isGainLimitDollar: ranges.gainIsDollar,
                lossLimit,
                isLossLimitDollar: ranges.lossIsDollar,
                prerunGainLimitValueSeconds: seconds,
                resultsPerDay: [],
              };
              // Loop for each day of data.
              for (let i = 0; i < dataSet.length; i++) {
                const minuteData = dataSet[i];
                if (!minuteData || minuteData.length===0) {
                  continue; // Skip this day (weekend or holiday).
                }
                if (ranges.countOnly) {
                  // Count only mode, just count the number of days that would have been traded.
                  ranges.estimatedDaysCount += 1;
                  continue;
                }
                // Prepare the day's summary record (for stopping at max daily gain or max daily loss).
                const tradingDate = new Date(minuteData[0].datetime);
                PrepareDailyTradeSummariesFor(tradeSettingsArray[0], tradingDate);
                const allTradesForOneDay = [];
                for (let j = 0; j < tradeSettingsArray.length; j++) {
                  const tradeSetting = tradeSettingsArray[j];
                  if (!tradeSetting.prerunGainLimitValue) {
                    tradeSetting.prerunGainLimitValue = {...defaultPrerunGainLimitValue};
                  }
                  tradeSetting.percentGain = gainLimit;
                  tradeSetting.percentLoss = lossLimit;
                  tradeSetting.entryHour = entryHour;
                  tradeSetting.exitHour = exitHour;
                  tradeSetting.percentGainIsDollar = ranges.gainIsDollar;
                  tradeSetting.percentLossIsDollar = ranges.lossIsDollar;
                  tradeSetting.prerunGainLimitValue.seconds = seconds;
                  tradeSetting.isBacktesting = true;
                  tradeSetting.commissionPerContract = 0;
                  // Define backtestingData within the tradeSetting object.
                  const tradeLeg = tradeSetting.legs[0];
                  tradeSetting.backtestingData = {
                    ...DefaultIBacktestingData,
                    tradeType: tradeLeg.callPut,
                    delta: tradeLeg.delta,
                    quantity: tradeLeg.quantity,
                  };
                  tradeSetting.backtestingData.minuteData = minuteData;
                  await mainBacktestTradeLoop(tradeSetting, allTradesForOneDay).catch(reason => {
                    LogData(tradeSetting, `Failed mainBacktestTradeLoop inside For Loop: ${reason}`, reason);
                    const hold = tradeSetting.backtestingData.minuteData;
                    tradeSetting.backtestingData.minuteData = [];
                    LogData(null, `TradeSettings.backtestData: ${JSON.stringify(tradeSetting.backtestingData)}`);
                    tradeSetting.backtestingData.minuteData = hold;
                  });
                }
                // Save all the trades for this day.
                backTestPatternSummary.resultsPerDay.push({
                  when: new Date(minuteData[0].datetime),
                  trades: allTradesForOneDay
                });
                totalTradesCount += allTradesForOneDay.length;
                Backtests.upsert({_id: userId}, {$set: {totalTradesCount}});
              }
              if (ranges.countOnly) {
                ranges.estimatedSummariesCount += 1;
              } else {
                // Now summarize for the backtest pattern over all the days traded.
                calculateSummary(backTestPatternSummary);
                addSummaryToSummaries(backTestPatternSummary, summaries);
                const modifier = {
                  $push: {summaries: backTestPatternSummary},
                  $inc: {totalSummariesCount: 1},
                };
                Backtests.upsert({_id: userId}, modifier);
              }
            }
          }
        }
      }
    }
    const end = dayjs();
    let duration = end.diff(start, 'seconds', true);
    let resolutionText = 'seconds';
    if (duration > 60) {
      duration = end.diff(start, 'minutes', true);
      resolutionText = 'minutes';
    }
    const durationText = duration.toFixed(3) + ' ' + resolutionText;
    if (ranges.countOnly) {
      const sumText = `BacktestLoop: ${durationText}, for ${ranges.estimatedDaysCount.toLocaleString()} estimated days traded.`;
      return {sumText, summaries};
    }
    const sumText = `BacktestLoop: ${durationText}, for ${totalTradesCount.toLocaleString()} actual trades.`;
    return {sumText, summaries};
  } catch (error) {
    throw new Meteor.Error(error.message);
  } finally {
    Backtests.upsert({_id: userId}, {$set: {isDone: true}});
  }
}

async function checkIfNotTooManyLoops(ranges: IRanges, dataSet: ICandle[][], tradeSettingsArray: ITradeSettings[], userId: string): Promise<boolean> {
  const holdOldValue = ranges.countOnly;
  ranges.countOnly = true;
  let results = await BackTestCallPut(ranges, dataSet, tradeSettingsArray, userId);
  ranges.countOnly = holdOldValue;
  const settings: IAppSettings = AppSettings.findOne(Constants.appSettingsId);
  const isOkToRun = ranges.estimatedSummariesCount <= settings.maxBacktestSummaries;

  const modifier = {
    $set: {
      ...DefaultIBacktest,
      resultsPerDay: [],
      estimatedSummariesCount: ranges.estimatedSummariesCount,
      estimatedTotalDaysTraded: ranges.estimatedDaysCount,
      isDone: false,
      isOkToRun,
    }
  };
  Backtests.upsert({_id: userId}, modifier);
  return isOkToRun;
}

async function BacktestTradeSetMethod(ranges: IRanges) {
  try {
    let tradesSet: ITradeSettingsSet = TradeSettingsSets.findOne(ranges.tradeSettingsSetId);
    // Preload the tradeSettings for this tradeSettingsSetId.
    const tradeSettingsArray: ITradeSettings[] = [];
    for (let j = 0; j < tradesSet.tradeSettingIds.length; j++) {
      const tradeSetting = TradeSettings.findOne(tradesSet.tradeSettingIds[j]);
      if (tradeSetting) {
        tradeSettingsArray.push(tradeSetting);
      }
    }
    Backtests.remove({_id: tradesSet.userId}); // Remove main backtest record
    Backtests.remove({userId: tradesSet.userId}); // Remove all Trade records associated with the main backtest record.
    if (tradeSettingsArray.length===0) {
      return;
    }
    const dataSet = await loadHistoricalData(ranges, tradesSet.userId, Constants.SPXSymbol);
    const isOkToModel = await checkIfNotTooManyLoops(ranges, dataSet, tradeSettingsArray, tradesSet.userId);
    if (isOkToModel) {
      let results = await BackTestCallPut(ranges, dataSet, tradeSettingsArray, tradesSet.userId);
      console.log(results.sumText);
    }
  } catch (error) {
    console.error(`BacktestTradeSetMethod failed with: ${error.message}`, error);
    throw new Meteor.Error(error.message);
  }
}

async function TestBackTestCode(): Promise<void> {
  const _id = 'backtestSettings';
  const ranges: IRanges = {
    ...GetDefaultRanges(),
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

    countOnly: true,
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
  ranges.estimatedDaysCount = 0;
  ranges.countOnly = false;
  let {sumText, summaries} = await BackTestCallPut(ranges, dataSet, [tradeSetting], tradeSetting.userId);
  console.log(summaries[0]);
  console.log(sumText);

  tradeSetting.legs = [...DefaultCallLegsSettings];
  ranges.estimatedDaysCount = 0;
  const rr = await BackTestCallPut(ranges, dataSet, [tradeSetting], tradeSetting.userId);
  console.log(rr.summaries[0]);
  console.log(rr.sumText);
}

export {
  TestBackTestCode,
  BacktestTradeSetMethod,
}