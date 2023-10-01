// @ts-ignore
import {Meteor} from 'meteor/meteor';
import PollingMutex from './PollingMutex';
import {GetPriceForSymbols} from './TDAApi/TDAApi';
import {InTradeHours} from "../imports/Utils";
import Constants from "../imports/Constants";
import {AppSettings} from './collections/AppSettings';
import IStreamerData from "../imports/Interfaces/IStreamData";


let csvSymbols: string = '$VIX.X';
let data = {};
let isPolling: boolean = false;
const userId = Meteor.users.findOne({username: 'Arch'})?._id;

function getAverageMark(data: IStreamerData[]): number {
  let sum = 0;
  data.forEach((item) => {
    sum += item.mark;
  });
  return sum / data.length;
}

function getSlope(data: IStreamerData[], samples: number, numberOfSamplesToAverage: number): number {
  if (data && data.length > samples && samples >= numberOfSamplesToAverage * 2) {
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
  setTimeout(releaseFunc, 1200); // Don't poll more than once per second.
  setTimeout(poll, 3000); // Repeat every 3 seconds.
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

function GetVIXSlopeAngle() {
  if (data['$VIX.X']) {
    const lastIndex = data['$VIX.X'].length - 1;
    return data['$VIX.X'][lastIndex].slopeAngle;
  }
  return 0;
}

function StartBackgroundPolling() {
  if (InTradeHours()) {
    isPolling = true;
    poll().then();
  } else {
    console.error('Not starting background polling because it is outside of trade hours.');
    isPolling = false;
  }
};

function StopBackgroundPolling() {
  isPolling = false;
}

export {
  StartBackgroundPolling,
  StopBackgroundPolling,
  GetVIXSlope,
  GetVIXMark,
  GetVIXSlopeAngle,
};