import {GetDaysStraddleValues} from "./DataAccess";
import dayjs, {Dayjs} from "dayjs";

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
  console.log(`${tradeDate.format("ddd YYYY-MM-DD")} ${sellPrice.toPrecision(3)} - ${buyPrice.toPrecision(3)} = ${gainLoss.toPrecision(2)}\t\t${results.gainLoss.toPrecision(4)}`);
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

export async function StraddleDailyOpenCloseModelWithLimits(ticker = 'QQQ', startDate: Dayjs, gainLimit, lossLimit, minutesDelay, minutesEarlyExit) {
  const results = {gainLoss: 0, dailyResults: []};
  let tradeDate = startDate;
  const today = dayjs();
  while (tradeDate.isBefore(today)) {
    const straddleData = await GetDaysStraddleValues(ticker, tradeDate);
    // straddleData can be null for a holiday.
    if (straddleData && straddleData.length > 0) {
      let [cnt, last] = getStartAndLastCounter(minutesDelay, minutesEarlyExit, straddleData);
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
      console.log(`Holiday: ${tradeDate.format("ddd YYYY-MM-DD")}`);
    }
    tradeDate = moveToNextTradeDay(tradeDate);
  }
  return results;
}

export function ExhaustiveExecution(){

}
