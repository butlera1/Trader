/**
 * This file contains methods to obtain Polygon.io data.
 */
import {StraddleData} from '../collections/straddleData.js';
import {StockData} from '../collections/stockData.js';
import {IAggs, IForexQuotes, ITradesQuotesQuery, restClient} from '@polygon.io/client-js';
import dayjs, {Dayjs} from 'dayjs'
import {GetNewYorkTimeAsText, GetNewYorkTimeAt} from "../../imports/Utils.ts";
import ICandle, {DefaultCandle} from "../../imports/Interfaces/ICandle.ts";

let straddleCache = null;
let stockCache = null;

const globalFetchOptions = {
  pagination: false,
};
const rest = restClient('CYBLK7kpM0FSCqMVn7auHmAdpFeuvm5s', "https://api.polygon.io", globalFetchOptions);

async function getTickForUnixNanoTime(symbol: string, timeText: string): Promise<ICandle> {
  try {
    const query: ITradesQuotesQuery = {'timestamp.lte': timeText, limit: 1};
    let tickData: IForexQuotes = await rest.forex.quotes(symbol, query);
    if (tickData?.results?.length > 0) {
      const tick = tickData.results[0];
      const lastTick = tickData.results[tickData.results.length - 1];
      const d1 = GetNewYorkTimeAsText(new Date(tick.participant_timestamp / 1000000));
      const d2 = GetNewYorkTimeAsText(new Date(lastTick.participant_timestamp / 1000000));
      // console.log(`First tick time: participant_ts: ${d1} to ${d2}`);
      return {
        open: tick.bid_price,
        high: tick.ask_price,
        low: tick.bid_price,
        close: tick.bid_price,
        volume: 0,
        datetime: tick.participant_timestamp / 1000000,
      };
    }
  } catch (error) {
    console.error('Error fetching tick data:', error);
  }
  return {...DefaultCandle};
}

export async function GetTickDataForDay(symbol: string, date: Dayjs) {
  try {
    let startTime = dayjs(`${date.format("YYYY-MM-DD")} 14:30:00.00Z`);
    const candles: ICandle[] = [];
    let count = 0;
    console.log(`Starting time NY: ${GetNewYorkTimeAsText(startTime.toDate())}`);
    const clockStart = dayjs();
    while (count < 4680) {
      const startTimeNanosecs = (startTime.unix() * 1000000000).toString(10);
      const result = await getTickForUnixNanoTime(symbol, startTimeNanosecs);
      if (count % 250===0) {
        console.log(`Looping time NY: ${GetNewYorkTimeAsText(startTime.toDate())}, count: ${count}`);
      }
      if (result) {
        candles.push(result);
      }
      count++;
      startTime = startTime.add(5, 'seconds');
      // console.log(`Looping time NY: ${GetNewYorkTimeAsText(startTime.toDate())}`);
    }
    console.log(`Done in ${dayjs().diff(clockStart, 'second')} seconds.`);
    console.log(`Ending time NY: ${GetNewYorkTimeAsText(startTime.toDate())}`);
    return candles;
  } catch (error) {
    console.error('Error fetching tick data:', error);
  }
  return [];
}

export async function GetSPYTickDataForDayWorks(date: Dayjs) {
  try {
    const startTime = dayjs(`${date.format("YYYY-MM-DD")} 16:30:00.00Z`);
    const startTimeNanosecs = (startTime.unix() * 1000000000).toString(10);
    const nyStart = (GetNewYorkTimeAt(9, 30).year(2023).month(12).day(17).unix() * 1000000).toString(10);
    const nyEnd = (GetNewYorkTimeAt(11, 0).year(2023).month(12).day(17).unix() * 1000000).toString(10);
    const validTS = '1702947598496106496';
    console.log(`UTC: ${nyStart} to ${nyEnd}`);
    console.log(`Valid: ${validTS}, ${startTimeNanosecs}`);
    const dateTry = (new Date('2023-12-18 16:30:00.00Z').getTime() * 1000000).toString(10);
    console.log(`Date: ${dateTry}`);

    //const query: ITradesQuotesQuery = {'timestamp.lte': '1702947598496106496', limit: 10000};
    const query: ITradesQuotesQuery = {'timestamp.lte': dateTry, limit: 10000};
    const ticker = 'SPY';
    let tickData: IForexQuotes = await rest.forex.quotes(ticker, query);
    if (tickData?.results?.length > 0) {
      const tick = tickData.results[0];
      const lastTick = tickData.results[tickData.results.length - 1];
      const d1 = GetNewYorkTimeAsText(new Date(tick.participant_timestamp / 1000000));
      const d2 = GetNewYorkTimeAsText(new Date(lastTick.participant_timestamp / 1000000));
      console.log(`First tick time: participant_ts: ${d1} to ${d2}`);
    }
    console.log('Done');
  } catch (error) {
    console.error('Error fetching tick data:', error);
  }
}


export async function GetOptionData(ticker: string = 'QQQ', date: Dayjs = dayjs('2022-09-29'), price: number): Promise<any> {
  try {
    const dateStr = date.format('YYYY-MM-DD');
    // Get underlying strike price first and use it to get options data.
    const stockId = `${ticker}${dateStr}`;
    const temp = String(price.toFixed(0)) + '000';
    const strikePrice = temp.padStart(8, '0');
    const from = dateStr;
    const to = dateStr;
    // Create options ticker to look like 'O:QQQ221003P00274000'
    const optionDate = getBestOptionClosingDate(date);
    const putOptionsTicker = `O:${ticker}${optionDate.format('YYMMDD')}P${strikePrice}`;
    const callOptionsTicker = `O:${ticker}${optionDate.format('YYMMDD')}C${strikePrice}`;
    const calls = await rest.options.aggregates(callOptionsTicker, 1, 'minute', from, to, {sort: 'asc', limit: 1000});
    const puts = await rest.options.aggregates(putOptionsTicker, 1, 'minute', from, to, {sort: 'asc', limit: 1000});

    if (puts.resultsCount===0 || calls.resultsCount===0) {
      return null;
    }
    const firstPutTime = dayjs(puts.results[0].t).format('hh:mm:ss');
    const firstCallTime = dayjs(calls.results[0].t).format('hh:mm:ss');
    console.log(`First put time: ${firstPutTime}, first call time: ${firstCallTime}`);
    const lastPutTime = dayjs(puts.results[puts.resultsCount - 1].t).format('YYYY-MM-DD hh:mm:ss');
    const lastCallTime = dayjs(calls.results[calls.resultsCount - 1].t).format('YYYY-MM-DD hh:mm:ss');
    console.log(`Last put time: ${lastPutTime}, last call time: ${lastCallTime}`);
    console.log(`Puts:`, puts.resultsCount);
    console.log(`Calls:`, calls.resultsCount);
  } catch (ex) {
    console.error(ex);
  }
}

/**
 * Loads stock data and options data into RAM-based cache for faster processing later.
 */
function cacheData() {
  if (straddleCache) return;
  console.log(`Loading cache...`);
  straddleCache = {};
  let cursor = StraddleData.find();
  let straddleCount = cursor.count();
  cursor.forEach(record => straddleCache[record._id] = record.straddles);
  if (stockCache) return;
  stockCache = {};
  cursor = StockData.find();
  let stockCount = cursor.count();
  cursor.forEach(record => stockCache[record._id] = record.stocks);
  console.log(`Finished loading cache with ${straddleCount} straddle and ${stockCount} stock records loaded.`);
}

/**
 * This method takes calls and puts and merges them at the same time stamp. Each set of
 * data has different number of bars and these bars depending on the transactions.
 * @param putData
 * @param callData
 * @constructor
 */
function MergePutsAndCalls(putData: IAggs, callData: IAggs) {
  const results = [];
  const calls = callData.results;
  const puts = putData.results;
  let pCnt = 0;
  let cCnt = 0;

  // TODO (AWB) Redo this to extrapolate the missing data such that normalized array has every minute of the day.

  // Loop over all the bars.
  while (pCnt < puts.length && cCnt < calls.length) {
    // Loop over the bars until we get ones where the timestamps match
    while ((pCnt < puts.length && cCnt < calls.length) && (puts[pCnt].t!==calls[cCnt].t)) {
      // Move puts to match calls if put's time is less.
      while (pCnt < puts.length && puts[pCnt].t < calls[cCnt].t) {
        pCnt++
      }
      if (pCnt===puts.length) break;

      // Move calls if call's Time is less than put's.
      while (cCnt < calls.length && calls[cCnt].t < puts[pCnt].t) {
        cCnt++
      }
      if (cCnt===calls.length) break;
    }
    if ((cCnt===calls.length) || (pCnt===puts.length)) break;

    // Now we have matching timestamps so we record the set as a straddle.
    const call = calls[cCnt];
    const put = puts[pCnt];
    results.push({time: call.t, call: call.vw, put: put.vw, straddle: call.vw + put.vw});
    pCnt++;
    cCnt++;
  }
  return results;
}

function MergePutsAndCallsInterpolated(putData: IAggs, callData: IAggs) {
  const results = [];
  const calls = callData.results;
  const puts = putData.results;
  let pCnt = 0;
  let cCnt = 0;
  // Loop over all the bars interpolating the data.
  while (pCnt < puts.length && cCnt < calls.length) {
    const call = calls[cCnt];
    const put = puts[pCnt];
    let time = dayjs(Math.min(put.t, call.t));
    let nextTime = dayjs(Math.max(put.t, call.t));
    while (time.isBefore(nextTime) || time.isSame(nextTime)) {
      if (results.length > 0 && results[results.length - 1].time===time.valueOf()) {
        // Remove previously created element to recreate it with the newer put & call.
        results.pop();
      } else {
        // console.log(time.format('hh:mm:ss'));
      }
      // Must interpolate the missing data.
      results.push({time: time.valueOf(), call: call.vw, put: put.vw, straddle: call.vw + put.vw});
      time = time.add(1, 'minute');
    }
    cCnt++;
    pCnt++;
  }
  return results;
}

/**
 * Given a date, calculate the closest weekly options (expiring on a Friday) that is
 * within 4 days (or more) of the provided date.
 * Dayjs has Sunday = 0, Monday = 1, ... Friday = 5.
 * @param date
 */
function getBestOptionClosingDate(date: Dayjs): Dayjs {
  const weekDay = date.day();
  const Friday = 5;
  let daysToFriday = Friday - weekDay;
  if (daysToFriday < 2) {
    // Use next week's options since we are too close to the expiration date for this week's options.
    daysToFriday += 7; // add a week.
  }
  return date.day(weekDay + daysToFriday);
}

export function ConsoleLogStraddleData(straddleData) {
  for (let i = 0; i < straddleData.length; i++) {
    console.log(`${new Date(straddleData[i].time)}: ${straddleData[i].straddle}`);
  }
}

/**
 * Get strike price based on the stock at the time of entry (taking minutesDelay into account).
 */
function getOpeningStrikePrice(minutesDelay, isUseDelay, prices) {
  let price = prices[0].vw;
  const startTime = dayjs(prices[0].t).add(minutesDelay, 'minute');
  if (isUseDelay && minutesDelay > 0) {
    for (let i = 1; i < prices.length; i++) {
      const now = dayjs(prices[i].t);
      if (now.isAfter(startTime)) {
        break;
      }
      price = prices[i].vw;
    }
  }
  return price;
}

export async function GetDaysStraddleValues(ticker = 'QQQ', date: Dayjs = dayjs('2022-09-29'), minutesDelay, isUseDelay) {
  try {
    cacheData(); // Preload the DB into cache RAM for speed.
    const dateStr = date.format('YYYY-MM-DD');
    // Get underlying strike price first and use it to get options data.
    const stockId = `${ticker}${dateStr}`;
    let result = stockCache[stockId];
    if (!result) {
      result = await rest.stocks.aggregates(ticker, 1, 'minute', dateStr, dateStr, {sort: 'asc'});
      stockCache[stockId] = result;
      StockData.upsert({_id: stockId}, {stocks: result});
    }
    if (!result?.results || result.results.length===0) {
      return null;
    }
    const price = getOpeningStrikePrice(minutesDelay, isUseDelay, result.results);
    const temp = String(price.toFixed(0)) + '000';
    const strikePrice = temp.padStart(8, '0');
    const from = dateStr;
    const to = dateStr;
    // Create options ticker to look like 'O:QQQ221003P00274000'
    const optionDate = getBestOptionClosingDate(date);
    const optionsTicker = `O:${ticker}${optionDate.format('YYMMDD')}P${strikePrice}`;
    // See if this data has already been obtained and if so return it immediately.
    if (straddleCache && straddleCache[optionsTicker]) {
      return straddleCache[optionsTicker];
    }
    const puts = await rest.options.aggregates(optionsTicker, 1, 'minute', from, to, {sort: 'asc', limit: 1000});
    const calls = await rest.options.aggregates(optionsTicker.replace('P0', 'C0'), 1, 'minute', from, to, {
      sort: 'asc',
      limit: 1000
    });
    if (puts.resultsCount===0 || calls.resultsCount===0) {
      // Cache no straddle data for a holiday.
      StraddleData.upsert({_id: optionsTicker}, {straddles: null});
      straddleCache[optionsTicker] = null;
      return null;
    }
    const firstPutTime = dayjs(puts.results[0].t).format('hh:mm:ss');
    const firstCallTime = dayjs(calls.results[0].t).format('hh:mm:ss');
    const mergedResults = MergePutsAndCalls(puts, calls);
    StraddleData.upsert({_id: optionsTicker}, {straddles: mergedResults});
    straddleCache[optionsTicker] = mergedResults;
    return mergedResults;
  } catch (ex) {
    console.error(ex);
  }
}

export async function GetDaysOptionValues(ticker = 'QQQ', optionType, date: Dayjs = dayjs('2022-09-29'), minutesDelay, isUseDelay) {
  try {
    cacheData(); // Preload the DB into cache RAM for speed.
    const dateStr = date.format('YYYY-MM-DD');
    // Get underlying strike price first and use it to get options data.
    const stockId = `${ticker}${dateStr}`;
    let result = stockCache[stockId];
    if (!result) {
      result = await rest.stocks.aggregates(ticker, 1, 'minute', dateStr, dateStr, {sort: 'asc'});
      stockCache[stockId] = result;
      StockData.upsert({_id: stockId}, {stocks: result});
    }
    if (!result?.results || result.results.length===0) {
      return null;
    }
    const price = getOpeningStrikePrice(minutesDelay, isUseDelay, result.results);
    const temp = String(price.toFixed(0)) + '000';
    const strikePrice = temp.padStart(8, '0');
    const from = dateStr;
    const to = dateStr;
    // Create options ticker to look like 'O:QQQ221003P00274000'
    const optionDate = getBestOptionClosingDate(date);
    const optionsTicker = `O:${ticker}${optionDate.format('YYMMDD')}P${strikePrice}`;
    // See if this data has already been obtained and if so return it immediately.
    if (straddleCache && straddleCache[optionsTicker]) {
      return straddleCache[optionsTicker];
    }
    const puts = await rest.options.aggregates(optionsTicker, 1, 'minute', from, to, {sort: 'asc', limit: 1000});
    const calls = await rest.options.aggregates(optionsTicker.replace('P0', 'C0'), 1, 'minute', from, to, {
      sort: 'asc',
      limit: 1000
    });
    if (puts.resultsCount===0 || calls.resultsCount===0) {
      // Cache no straddle data for a holiday.
      StraddleData.upsert({_id: optionsTicker}, {straddles: null});
      straddleCache[optionsTicker] = null;
      return null;
    }
    const firstPutTime = dayjs(puts.results[0].t).format('hh:mm:ss');
    const firstCallTime = dayjs(calls.results[0].t).format('hh:mm:ss');
    const mergedResults = MergePutsAndCalls(puts, calls);
    StraddleData.upsert({_id: optionsTicker}, {straddles: mergedResults});
    straddleCache[optionsTicker] = mergedResults;
    return mergedResults;
  } catch (ex) {
    console.error(ex);
  }
}