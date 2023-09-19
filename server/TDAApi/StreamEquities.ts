import WebSocket from 'ws';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
import {GetUserPrinciples} from './TDAApi';
import _ from 'lodash';
import ITradeSettings, {BadDefaultIPrice, IPrice} from '../../imports/Interfaces/ITradeSettings';
import CalculateOptionsPricing from '../CalculateOptionsPricing';
import Constants from '../../imports/Constants';
import IStreamerData from '../../imports/Interfaces/IStreamData';
import {AppSettings} from '../collections/AppSettings';
import {GetNewYorkTimeNowAsText} from '../Trader';

let isWsOpen = false;
let streamedData = {};
let streamingCheckIntervalHandle = null;

// Utility
function jsonToQueryString(json) {
  return Object.keys(json).map(function (key) {
    return encodeURIComponent(key) + '=' +
      encodeURIComponent(json[key]);
  }).join('&');
}

let mySock = null;
let userPrincipalsResponse = null;
let requestId = 0;

function incrementRequestId() {
  requestId++;
  if (requestId > 9999999) {
    requestId = 0;
  }
  return `${requestId}`;
}

function StopDataStreaming() {
  if (mySock) {
    mySock.close();
  }
  isWsOpen = false;
  mySock = null;
}

let valuesToBePersisted = {};

function EraseAllStreamedData() {
  streamedData = {}; // Clear out old data.
  valuesToBePersisted = {};
}

function recordQuoteData(item) {
  if (item.service === 'QUOTE' || item.service === 'OPTION') {
    item.content.forEach((quote) => {
      let lastQuote: IStreamerData = {volume: 0};
      if (streamedData[quote.key]?.length > 0) {
        lastQuote = streamedData[quote.key][streamedData[quote.key].length - 1];
      } else {
        streamedData[quote.key] = [];
      }
      const value: IStreamerData = {
        symbol: quote.key,
        mark: quote[49] ?? quote[41] ?? lastQuote.mark,
        volume: quote[8] ?? lastQuote.volume ?? 0,
        volatility: quote[24] ?? lastQuote.volatility ?? 0,
        underlyingPrice: quote[39] ?? 0,
        when: new Date(item.timestamp),
        slopeAngle: 0,
        vwap: 0,
        vwapSlopeAngle: 0,
      };
      streamedData[value.symbol].push(value);
      const settings = AppSettings.findOne(Constants.appSettingsId);
      const slopeSamplesToAverage = settings?.slopeSamplesToAverage ?? 5;
      const totalSlopeSamples = settings?.totalSlopeSamples ?? 10;
      // Adjust volume to be the difference between the last two quotes.
      value.tickVolume = value.volume - lastQuote.volume;
      value.slopeAngle = GetSlopeAngleOfSymbol(value.symbol, totalSlopeSamples, slopeSamplesToAverage);
      value.vwap = CalculateVWAP();
      value.vwapSlopeAngle = CalculateVWAPSlopeAngle();
      value.maxMark = ((lastQuote.maxMark ?? 0) > value.mark) ? lastQuote.maxMark : value.mark;
      value.minMark = ((lastQuote.minMark ?? 0) < value.mark) ? lastQuote.minMark : value.mark;
      if (value.minMark === undefined) {
        value.minMark = value.mark;
      }
      // console.log(`Streamed ${quote.key}: ${value.mark} Angle: ${value.slopeAngle} VWAP: ${value.vwap} TickVol: ${value.tickVolume} Min: ${value.minMark} Max: ${value.maxMark}`);
    });
  }
}

function getHourAndMinute(dateTimeText: string) {
  const parts = dateTimeText.split(' ');
  let hoursAdded = 0;
  if (parts[parts.length - 1] === 'PM') {
    hoursAdded = 12;
  }
  const timeOnlyText = parts.find((part) => part.includes(':'));
  const timeParts = timeOnlyText.split(':');
  return {
    hour: parseInt(timeParts[0]) + hoursAdded,
    minute: parseInt(timeParts[1]),
  };
}

function afterHours() {
  const nyTimeText = GetNewYorkTimeNowAsText();
  const parts = getHourAndMinute(nyTimeText);
  const nowHour = parts.hour;
  const nowMinute = parts.minute;
  const settings = AppSettings.findOne(Constants.appSettingsId);
  const endHour = settings.endOfDayHourNY;
  const endMinute = settings.endOfDayMinuteNY;
  return (
    (nowHour > endHour) ||
    (nowHour === endHour && nowMinute > endMinute)
  );
}

async function waitForLogin() {
  return new Promise((resolve, reject) => {
    let count = 0;
    const interval = Meteor.setInterval(() => {
      count++;
      if (isWsOpen) {
        Meteor.clearInterval(interval);
        resolve(true);
      }
      if (count > 30) { // Wait 3 seconds max.
        Meteor.clearInterval(interval);
        reject(false);
      }
    }, 100);
  });
}

async function PrepareStreaming() {
  StopDataStreaming();
  const userId = Meteor.users.findOne({username: 'Arch'})?._id;
  if (userId) {
    userPrincipalsResponse = await GetUserPrinciples(userId);
    //Converts ISO-8601 response in snapshot to ms since epoch accepted by Streamer
    let tokenTimeStampAsDateObj = new Date(userPrincipalsResponse?.streamerInfo.tokenTimestamp);
    let tokenTimeStampAsMs = tokenTimeStampAsDateObj.getTime();

    let credentials = {
      "userid": userPrincipalsResponse.accounts[0].accountId,
      "token": userPrincipalsResponse.streamerInfo.token,
      "company": userPrincipalsResponse.accounts[0].company,
      "segment": userPrincipalsResponse.accounts[0].segment,
      "cddomain": userPrincipalsResponse.accounts[0].accountCdDomainId,
      "usergroup": userPrincipalsResponse.streamerInfo.userGroup,
      "accesslevel": userPrincipalsResponse.streamerInfo.accessLevel,
      "authorized": "Y",
      "timestamp": tokenTimeStampAsMs,
      "appid": userPrincipalsResponse.streamerInfo.appId,
      "acl": userPrincipalsResponse.streamerInfo.acl
    };

    const loginRequest = {
      "requests": [
        {
          "service": "ADMIN",
          "command": "LOGIN",
          "requestid": incrementRequestId(),
          "account": userPrincipalsResponse.accounts[0].accountId,
          "source": userPrincipalsResponse.streamerInfo.appId,
          "parameters": {
            "credential": jsonToQueryString(credentials),
            "token": userPrincipalsResponse.streamerInfo.token,
            "version": "1.0"
          }
        },
      ]
    };

    mySock = new WebSocket("wss://" + userPrincipalsResponse.streamerInfo.streamerSocketUrl + "/ws");

    mySock.onmessage = Meteor.bindEnvironment(function (evt) {
      const data = JSON.parse(evt.data);
      if (data?.response && data.response[0]?.content?.code === 0 && data.response[0]?.command === "LOGIN") {
        console.log("Streaming Logged In");
        isWsOpen = true;
        const settings = AppSettings.findOne(Constants.appSettingsId);
        const vwapEquity = settings?.vwapEquity ?? 'SPY';
        AddEquitiesToStream(vwapEquity);
        if (!streamingCheckIntervalHandle) {
          streamingCheckIntervalHandle = Meteor.setInterval(resetStreamingIfFlatLining, 1000 * 5); // every 5 seconds check if flat lining.
        }
      }
      if (data && _.isArray(data.data)) {
        data.data.forEach((item) => {
          recordQuoteData(item);
        });
      }
    });

    mySock.onclose = function (evt) {
      mySock = null;
      isWsOpen = false;
      console.log("Streaming WebSocket CLOSED.");
    };

    mySock.onopen = function (evt) {
      mySock.send(JSON.stringify(loginRequest));
    };

    mySock.on('error', (reason) => console.error(`WebSocket Error of: ${reason}`));

    return await waitForLogin();
  } else {
    console.error('PrepareStreaming: No user found.');
  }
  return false;
}

const currentlyStreamedOptionsNames: string[] = [];
const currentlyStreamedEquityNames: string[] = [];

function buildNames(names: string, list: string[]): string {
  const symbols = names.split(',');
  symbols.forEach((symbol) => {
    if (!list.includes(symbol)) {
      list.push(symbol);
    }
  });
  return list.join(',');
}

function AddEquitiesToStream(equityNames: string) {
  if (isWsOpen) {
    const keys = buildNames(equityNames, currentlyStreamedEquityNames);
    const requestQuotes = {
      requests: [
        {
          service: 'QUOTE',
          requestid: incrementRequestId(),
          command: 'SUBS',
          account: userPrincipalsResponse.accounts[0].accountId,
          source: userPrincipalsResponse.streamerInfo.appId,
          parameters: {
            keys,
            // 0: Symbol
            // 8: Cumulative daily volume
            // 24: Volatility
            // 49: Mark Price
            fields: '0,8,24,49',
          },
        },
      ]
    };
    mySock.send(JSON.stringify(requestQuotes));
    console.log("Streaming Equities: " + keys);
  }
}

function resetStreamingIfFlatLining() {
  if (IsStreamingQuotes()) {
    const now = new Date();
    const settings = AppSettings.findOne(Constants.appSettingsId);
    const vwapEquity = settings?.vwapEquity ?? 'SPY';
    const lastQuote = LatestQuote(vwapEquity);
    if (lastQuote) {
      const diff = now.getTime() - lastQuote.when.getTime();
      if (diff > 3000) { // If no data for 3 seconds, reset streaming.
        console.error('Resetting streaming due to flat lining.');
        PrepareStreaming()
          .then(() => {
            console.error(`Reset Streaming due to flat lining.`);
          })
          .catch((err) => {
            console.error(`Error resetting streaming due to flat lining: ${err}`);
          });
      }
    }
  }
  else {
    if (streamingCheckIntervalHandle) {
      // If not streaming and there is a timer, clear it.
      Meteor.clearInterval(streamingCheckIntervalHandle);
      streamingCheckIntervalHandle = null;
    }
  }
}

function AddOptionsToStream(optionNames: string) {
  if (isWsOpen) {
    const keys = buildNames(optionNames, currentlyStreamedOptionsNames);
    const requestOptionQuotes = {
      requests: [
        {
          service: 'OPTION',
          requestid: incrementRequestId(),
          command: 'SUBS',
          account: userPrincipalsResponse.accounts[0].accountId,
          source: userPrincipalsResponse.streamerInfo.appId,
          parameters: {
            keys,
            // 0: Symbol
            // 8: Cumulative daily volume
            // 39: Underlying price
            // 41: Mark Price
            fields: '0,8,39,41',
          },
        },
      ]
    };
    mySock.send(JSON.stringify(requestOptionQuotes));
    console.log("Streaming Options: " + keys);
  }
}

function LatestQuote(symbol: string): IStreamerData {
  if (streamedData[symbol]) {
    return streamedData[symbol][streamedData[symbol].length - 1];
  }
  return {mark: 0, symbol: symbol, slopeAngle: 0, when: new Date()};
}

function getAverageMark(data: IStreamerData[]): number {
  let sum = 0;
  data.forEach((item) => {
    sum += item.mark;
  });
  return sum / data.length;
}

function GetSlopeAngleOfSymbol(symbol: string, samples: number, numberOfSamplesToAverage: number): number {
  const data: IStreamerData[] = streamedData[symbol];
  if (data && data.length > samples && samples >= numberOfSamplesToAverage * 2) {
    const firstIndex = data.length - samples;
    const secondIndex = data.length - numberOfSamplesToAverage;
    const firstAvgMark = getAverageMark(data.slice(firstIndex, firstIndex + numberOfSamplesToAverage - 1));
    const lastAvgMark = getAverageMark(data.slice(secondIndex));
    const slope = (lastAvgMark - firstAvgMark) / 2;
    // Get angle and clip to 1 decimal place.
    const angle = Math.trunc((Math.atan(slope) * 180 / Math.PI) * 10) / 10;
    return angle;
  }
  return 0;
}

function GetVWAPMarkMax() {
  const settings = AppSettings.findOne(Constants.appSettingsId);
  const vwapEquity = settings?.vwapEquity ?? 'SPY';
  const data: IStreamerData[] = streamedData[vwapEquity] || [];
  if (data.length === 0) return 0;
  return data[data.length - 1].maxMark;
}

function GetVWAPMarkMin() {
  const settings = AppSettings.findOne(Constants.appSettingsId);
  const vwapEquity = settings?.vwapEquity ?? 'SPY';
  const data: IStreamerData[] = streamedData[vwapEquity] || [];
  if (data.length === 0) return 0;
  return data[data.length - 1].minMark;
}

function GetVWAPSlopeAngle() {
  const settings = AppSettings.findOne(Constants.appSettingsId);
  const vwapEquity = settings?.vwapEquity ?? 'SPY';
  const data: IStreamerData[] = streamedData[vwapEquity] || [];
  if (data.length === 0) return 0;
  return data[data.length - 1].vwapSlopeAngle;
}

function GetVWAPMark() {
  const settings = AppSettings.findOne(Constants.appSettingsId);
  const vwapEquity = settings?.vwapEquity ?? 'SPY';
  const data: IStreamerData[] = streamedData[vwapEquity] || [];
  if (data.length === 0) return 0;
  return data[data.length - 1].mark;
}

function CalculateVWAP(): number {
  const settings = AppSettings.findOne(Constants.appSettingsId);
  const vwapNumberOfSamples = settings?.vwapNumberOfSamples ?? 60;
  const vwapEquity = settings?.vwapEquity ?? 'SPY';
  const data: IStreamerData[] = streamedData[vwapEquity] || [];
  if (data.length < vwapNumberOfSamples) return data[data.length - 1]?.mark;
  let sumPriceTimesVolume = 0;
  let sumVolume = 0;
  for (let i = data.length - vwapNumberOfSamples; i < data.length; i++) {
    const currentData = data[i];
    if (!currentData.mark || !currentData.tickVolume) continue;
    sumPriceTimesVolume += currentData.mark * currentData.tickVolume;
    sumVolume += currentData.tickVolume;
  }
  const vwap = Math.trunc((sumVolume ? sumPriceTimesVolume / sumVolume : 0) * 10000) / 10000;
  if (vwap === 0) {
    console.log("VWAP is zero");
  }
  return vwap;
}

function CalculateVWAPSlopeAngle(): number {
  const settings = AppSettings.findOne(Constants.appSettingsId);
  const vwapSlopeSamplesRequired = settings?.vwapSlopeSamplesRequired ?? 10;
  const vwapEquity = settings?.vwapEquity ?? 'SPY';
  const data: IStreamerData[] = streamedData[vwapEquity] || [];
  if (data && data.length > vwapSlopeSamplesRequired) {
    const firstVWAP = data[data.length - vwapSlopeSamplesRequired].vwap;
    const secondVWAP = data[data.length - 1].vwap;
    const slope = (secondVWAP - firstVWAP) / 2;
    // Get angle and clip to 1 decimal place.
    const angle = Math.trunc((Math.atan(slope) * 180 / Math.PI) * 1000) / 1000;
    return angle;
  }
  return 0;
}

function IsStreamingQuotes() {
  return isWsOpen;
}

function GetStreamingOptionsPrice(tradeSettings: ITradeSettings) {
  let result: IPrice = {...BadDefaultIPrice, price: 0, whenNY: new Date()};
  if (!IsStreamingQuotes()) {
    return result;
  }
  result.underlyingPrice = LatestQuote(tradeSettings.symbol).mark || tradeSettings.underlyingPrice;
  tradeSettings.legs.forEach((leg) => {
    const quote = LatestQuote(leg.option.symbol);
    result = CalculateOptionsPricing(result, leg, quote.mark);
  });
  return result;
}

export {
  PrepareStreaming,
  StopDataStreaming,
  LatestQuote,
  AddOptionsToStream,
  IsStreamingQuotes,
  GetStreamingOptionsPrice,
  AddEquitiesToStream,
  GetSlopeAngleOfSymbol,
  CalculateVWAP,
  GetVWAPMarkMax,
  GetVWAPMarkMin,
  GetVWAPMark,
  GetVWAPSlopeAngle,
  EraseAllStreamedData,
};