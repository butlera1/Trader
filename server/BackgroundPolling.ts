import {Meteor} from 'meteor/meteor';
import PollingMutex from './PollingMutex';
import {GetPriceForSymbols} from './TDAApi/TDAApi';
import {CalculateTradePrice, InTradeHours} from "../imports/Utils";
import Constants from "../imports/Constants";
import {AppSettings} from './collections/AppSettings';
import IStreamerData from "../imports/Interfaces/IStreamData";
import ITradeSettings, {BadDefaultIPrice, IPrice} from "../imports/Interfaces/ITradeSettings.ts";


let csvSymbols: string = '$VIX.X,$SPX.X';
let data = {};
let isPolling: boolean = false;
const userId = Meteor.users.findOne({username: 'Arch'})?._id;

/**
 * Adds one or more symbols to the polling list.
 * @param csvSymbols
 * @constructor
 */
function AddSymbolsToPolling(newCSVSymbols: string) {
  let arry1 = csvSymbols.split(',');
  arry1 = arry1.concat(newCSVSymbols.split(','));
  csvSymbols = arry1.join(',');
}

function getAverageMark(data: IStreamerData[]): number {
  let sum = 0;
  data.forEach((item) => {
    sum += item.mark;
  });
  return sum / data.length;
}

function getSlope(data: IStreamerData[], samples: number, numberOfSamplesToAverage: number): number {
  if (data && data.length > samples && samples >= numberOfSamplesToAverage) {
    const firstIndex = data.length - samples;
    const secondIndex = data.length - numberOfSamplesToAverage;
    const firstAvgMark = getAverageMark(data.slice(firstIndex, firstIndex + numberOfSamplesToAverage - 1));
    const lastAvgMark = getAverageMark(data.slice(secondIndex));
    const slope = Math.trunc(((lastAvgMark - firstAvgMark) / 2) * 1000) / 1000;
    return slope;
  }
  return 0;
}

function getAngleOfSlope(slope) {
  // Get angle and clip to 1 decimal place.
  const angle = Math.trunc((Math.atan(slope) * 180 / Math.PI) * 10) / 10;
  return angle;
}

async function poll() {
  if (!isPolling) {
    console.log('Polling is turned off so no more background polling.');
    data = {};
    return;
  }
  const releaseFunc = await PollingMutex();
  try {
    const results = await GetPriceForSymbols(userId, csvSymbols).catch(err => {
      console.error(err);
      return [];
    });
    results.forEach(currentQuote => {
      if (currentQuote && currentQuote.symbol) {
        if (currentQuote.lastPrice && !currentQuote.mark) {
          currentQuote.mark = currentQuote.lastPrice;
        }
        if (!data[currentQuote.symbol]) {
          data[currentQuote.symbol] = [];
        }
        data[currentQuote.symbol].push(currentQuote);
        currentQuote.whenNY = new Date();
        const settings = AppSettings.findOne(Constants.appSettingsId);
        const slopeSamplesToAverage = settings?.slopeSamplesToAverage ?? 5;
        const totalSlopeSamples = settings?.totalSlopeSamples ?? 10;
        currentQuote.slope = getSlope(data[currentQuote.symbol], totalSlopeSamples, slopeSamplesToAverage);
        currentQuote.slopeAngle = getAngleOfSlope(currentQuote.slope);
      }
    });
  } catch (err) {
    console.error(err);
  }
  setTimeout(releaseFunc, Constants.TwoSeconds); // Don't poll more than once per second.
  setTimeout(poll, Constants.ThreeSeconds);
}

function GetVIXSlope() {
  if (data['$VIX.X']) {
    const lastIndex = data['$VIX.X'].length - 1;
    return data['$VIX.X'][lastIndex].slope;
  }
  return 0;
}

function GetVIXMark() {
  if (data['$VIX.X']) {
    const lastIndex = data['$VIX.X'].length - 1;
    return data['$VIX.X'][lastIndex].mark;
  }
  return 0;
}

/**
 * Meteor Method used to chart SPX data on UI.
 */
function GetSPXData() {
  try {
    if (!Meteor.userId()) {
      return new Meteor.Error('Must have valid user in GetSPXData.');
    }
    return data[Constants.SPXSymbol] ?? [{mark: 25, whenNY: new Date()}];
  } catch (e) {
    return new Meteor.Error(e.message);
  }
}

function GetVIXSlopeAngle() {
  if (data['$VIX.X']) {
    const lastIndex = data['$VIX.X'].length - 1;
    return data['$VIX.X'][lastIndex].slopeAngle;
  }
  return 0;
}

function StartBackgroundPolling() {
  try {
    if (InTradeHours()) {
      isPolling = true;
      csvSymbols = '$VIX.X,$SPX.X';
      poll().then();
      console.log('Starting background polling.');
    } else {
      console.error('Not starting background polling because it is outside of trade hours.');
      isPolling = false;
    }
  } catch (err) {
    console.error(`StartBackgroundPolling failed with: `, err);
    isPolling = false;
  }
};

function StopBackgroundPolling() {
  isPolling = false;
}

function GetTradePriceViaBackgroundPolling(liveTrade:ITradeSettings) :IPrice{
  try {
    const symbols = liveTrade.csvSymbols.split(',');
    const quotes = [];
    symbols.forEach((symbol) => {
      if (data[symbol]) {
        const lastIndex = data[symbol].length - 1;
        quotes.push(data[symbol][lastIndex]);
      }
    });
    return CalculateTradePrice(liveTrade, quotes);
  } catch (err) {
    console.error(`GetTradePriceViaBackgroundPolling failed with: `, err);
    return {...BadDefaultIPrice};
  }
}
export {
  StartBackgroundPolling,
  StopBackgroundPolling,
  GetVIXSlope,
  GetVIXMark,
  GetVIXSlopeAngle,
  GetSPXData,
  AddSymbolsToPolling,
  GetTradePriceViaBackgroundPolling,
};