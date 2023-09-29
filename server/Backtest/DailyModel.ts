import {GetDaysOptionValues, GetDaysStraddleValues} from "./DataAccess";
import dayjs, {Dayjs} from "dayjs";
import fs from 'fs';
import ITradeSettings from '../../imports/Interfaces/ITradeSettings';

const Saturday = 6;

function recordTrade(buyPrice, sellPrice, tradeDate: dayjs.Dayjs, gainLoss: number, results: { dailyResults: any[]; gainLoss: number }) {
  const daysResult = {
    buyPrice,
    sellPrice,
    tradeDate,
    gainLoss,
  };
  results.gainLoss += gainLoss;
  results.dailyResults.push(daysResult);
  // console.log(`${tradeDate.format("ddd YYYY-MM-DD")} ${sellPrice.toPrecision(3)} - ${buyPrice.toPrecision(3)} = ${gainLoss.toPrecision(2)}\t\t${results.gainLoss.toPrecision(4)}`);
}

function moveToNextTradeDay(tradeDate) {
  tradeDate = tradeDate.add(1, 'day');
  if (tradeDate.day() === Saturday) {
    // Move to the next Monday
    tradeDate = tradeDate.add(2, 'day');
  }
  return tradeDate;
}

function getStartAndLastCounter(minutesDelay, minutesEarlyExit, straddleData) {
  let cnt = 0;
  let last = straddleData.length - 1;
  // Move cnt to desired start time.
  const startTime = dayjs((straddleData[cnt].time)).add(minutesDelay, 'minute').valueOf();
  while (cnt < straddleData.length && straddleData[cnt].time < startTime) cnt++;
  // Move last to desired end time.
  const endTime = dayjs((straddleData[last].time)).subtract(minutesEarlyExit, 'minute').valueOf();
  while (last > -1 && straddleData[last].time > endTime) last--;
  return [cnt, last];
}

export async function SingleOption(ticker, startDate: Dayjs, gainLimit, lossLimit, minutesDelay, minutesEarlyExit, optionType) {
  const results = {
    ticker,
    startDate,
    gainLimit,
    lossLimit,
    minutesDelay,
    minutesEarlyExit,
    gainLoss: 0,
    dailyResults: []
  };
  let tradeDate = startDate;
  const today = dayjs();
  while (tradeDate.isBefore(today)) {
    const straddleData = await GetDaysOptionValues(ticker, optionType, tradeDate, minutesDelay, true);
    // straddleData can be null for a holiday.
    if (straddleData && straddleData.length > 0) {
      let [cnt, last] = getStartAndLastCounter(minutesDelay, minutesEarlyExit, straddleData);
      if (cnt < straddleData.length && last < straddleData.length) {
        const sellPrice = straddleData[cnt].straddle;
        cnt++;
        while (cnt <= last) {
          const buyPrice = straddleData[cnt].straddle;
          const gainLoss = sellPrice - buyPrice;
          // Take the trade if we hit a limit, or it is the end of the day
          if (gainLoss >= gainLimit || gainLoss <= -lossLimit || cnt === last) {
            recordTrade(buyPrice, sellPrice, tradeDate, gainLoss, results);
            break;
          }
          cnt++;
        }
      } else {
        // console.log(`Cnt or last are out of bounds for straddleData: ${straddleData.length}`);
      }
    } else {
      // console.log(`Holiday: ${tradeDate.format("ddd YYYY-MM-DD")}`);
    }
    tradeDate = moveToNextTradeDay(tradeDate);
  }
  const out = `${ticker} ${startDate.format('ddd YY-MM-DD')} ` +
    `gainLimit: ${gainLimit.toFixed(2)} lossLimit: ${lossLimit.toFixed(1)} minutesDelay: ${minutesDelay} ` +
    `minutesEarlyExit: ${minutesEarlyExit} gainLoss: ${results.gainLoss.toFixed(2)}`;
  const out2 = `${ticker},${startDate.format('ddd YY-MM-DD')},` +
    `${gainLimit.toFixed(2)},${lossLimit.toFixed(1)},${minutesDelay},` +
    `${minutesEarlyExit},${results.gainLoss.toFixed(2)}`;
  console.log(out2);
  return results;
}

export async function StraddleDailyOpenCloseModelWithLimits(ticker = 'QQQ', startDate: Dayjs, gainLimit, lossLimit, minutesDelay, minutesEarlyExit, isUseDelay = true) {
  const results = {
    ticker,
    startDate,
    gainLimit,
    lossLimit,
    minutesDelay,
    minutesEarlyExit,
    gainLoss: 0,
    dailyResults: []
  };
  let tradeDate = startDate;
  const today = dayjs();
  while (tradeDate.isBefore(today)) {
    const straddleData = await GetDaysStraddleValues(ticker, tradeDate, minutesDelay, isUseDelay);
    // straddleData can be null for a holiday.
    if (straddleData && straddleData.length > 0) {
      let [cnt, last] = getStartAndLastCounter(minutesDelay, minutesEarlyExit, straddleData);
      if (cnt < straddleData.length && last < straddleData.length) {
        const sellPrice = straddleData[cnt].straddle;
        cnt++;
        while (cnt <= last) {
          const buyPrice = straddleData[cnt].straddle;
          const gainLoss = sellPrice - buyPrice;
          // Take the trade if we hit a limit, or it is the end of the day
          if (gainLoss >= gainLimit || gainLoss <= -lossLimit || cnt === last) {
            recordTrade(buyPrice, sellPrice, tradeDate, gainLoss, results);
            break;
          }
          cnt++;
        }
      } else {
        // console.log(`Cnt or last are out of bounds for straddleData: ${straddleData.length}`);
      }
    } else {
      // console.log(`Holiday: ${tradeDate.format("ddd YYYY-MM-DD")}`);
    }
    tradeDate = moveToNextTradeDay(tradeDate);
  }
  const out = `${ticker} ${startDate.format('ddd YY-MM-DD')} ` +
    `gainLimit: ${gainLimit.toFixed(2)} lossLimit: ${lossLimit.toFixed(1)} minutesDelay: ${minutesDelay} ` +
    `minutesEarlyExit: ${minutesEarlyExit} gainLoss: ${results.gainLoss.toFixed(2)}`;
  const out2 = `${ticker},${startDate.format('ddd YY-MM-DD')},` +
    `${gainLimit.toFixed(2)},${lossLimit.toFixed(1)},${minutesDelay},` +
    `${minutesEarlyExit},${results.gainLoss.toFixed(2)}`;
  console.log(out2);
  return results;
}

export async function OneStraddleExecution(ticker) {
  const results = await StraddleDailyOpenCloseModelWithLimits(ticker, dayjs('2022-01-03'), 0.8, 1.5, 20, 90);
  const fileName = '/Users/arch/Code/OpTrader/oneYearResults.csv';
  fs.writeFileSync(fileName, 'Ticker,TradeDate,Buy Price,Sell Price,Gain-Loss,Total Gain-Loss\n');
  let totalGainLoss = 0;
  for (let i = 0; i < results.dailyResults.length; i++) {
    const item = results.dailyResults[i];
    totalGainLoss += item.gainLoss;
    const line = `${results.ticker},${item.tradeDate.format('YYYY-MM-DD')},${item.buyPrice.toFixed(2)},${item.sellPrice.toFixed(2)},${item.gainLoss.toFixed(2)},${totalGainLoss.toFixed(2)}\n`;
    fs.appendFileSync(fileName, line);
  }
  return results;
}

export async function ExhaustiveStraddleExecution(ticker) {
  const startDate = dayjs('2022-01-03');
  const results = [];
  const fileName = '/Users/arch/Code/OpTrader/exhaustiveResults.csv';
  fs.writeFileSync(fileName, 'Ticker,Date,Gain Limit, Loss Limit, Minutes Delay, Minutes Early Exit, Gain-Loss\n');
  const totalLoops = 4 * 4 * 5 * 5; // Multiplying the loops below for the total.
  let completionTime = '';
  let loopCount = 1;
  for (let minutesEarlyExit = 0; minutesEarlyExit < 120; minutesEarlyExit += 30) {
    for (let minutesDelay = 0; minutesDelay < 40; minutesDelay += 10) {
      for (let lossLimit = 0.5; lossLimit < 3.0; lossLimit += .5) {
        for (let gainLimit = 0.4; gainLimit < 1.4; gainLimit += 0.2) {
          const codeStartTime = dayjs();
          const loopResult = await StraddleDailyOpenCloseModelWithLimits(ticker, startDate, gainLimit, lossLimit, minutesDelay, minutesEarlyExit, false);
          results.push(loopResult.dailyResults);
          const dataStr = `${ticker},${startDate.format('ddd YY-MM-DD')},` +
            `${gainLimit.toFixed(2)},${lossLimit.toFixed(1)},${minutesDelay},` +
            `${minutesEarlyExit},${loopResult.gainLoss.toFixed(2)}\n`;
          fs.appendFileSync(fileName, dataStr);
          if (loopCount === 1) {
            const now = dayjs();
            const timeForOneLoop = now.valueOf() - codeStartTime.valueOf();
            const estCompletionTime = dayjs(now.valueOf() + timeForOneLoop * (totalLoops - 1));
            completionTime = `To be completed at: ${estCompletionTime.format('hh:mm:ss')} (started at ${now.format('hh:mm:ss')}).`;
          }
          console.log(`${loopCount++}/${totalLoops} completed. ${completionTime}`);
        }
      }
    }
  }
  console.log(`Completed writing ${fileName}.`);
}

function isTradingToday(date: Dayjs) {
  return true;
}

function simulateTrade(tradeSettings: ITradeSettings, tradeDate: Dayjs) {
  // Check if settings is within time to run
  // if it is a trading day.
  // Get the open and close orders.
  // Execute the open order
  // Monitor for trade exit and execute the close trade.
  // Return the results.
  return {};
}

export async function BackTest(tradeSettings: ITradeSettings, startDate: Dayjs, endDate: Dayjs) {
  let runDate = startDate.clone().set('hour', 9).set('minute', 31).set('second', 0);
  while (runDate.isBefore(endDate) && runDate.isBefore(dayjs()) && isTradingToday(runDate)) {
    const result = simulateTrade(tradeSettings, runDate);
    runDate = moveToNextTradeDay(runDate);
  }

}
