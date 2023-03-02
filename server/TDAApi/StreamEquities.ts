import WebSocket from 'ws';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
import {GetUserPrinciples} from './TDAApi';
import _ from 'lodash';
import ITradeSettings, {BadDefaultIPrice, IPrice} from '../../imports/Interfaces/ITradeSettings';
import CalculateOptionsPricings from '../CalculateOptionsPricing';
import Constants from '../../imports/Constants';
import IStreamerData from '../../imports/Interfaces/IStreamData';
import {AppSettings} from '../collections/AppSettings';

let isWsOpen = false;
let streamedData = {};

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

function CloseWebSocket() {
  if (mySock) {
    mySock.close();
  }
  isWsOpen = false;
  mySock = null;
}

let valuesToBePersisted = {};

function eraseAllData() {
  streamedData = {}; // Clear out old data.
  valuesToBePersisted = {};
  // StreamedData.remove(Constants.streamedDataId);
}

function recordQuoteData(item) {
  if (item.service === 'QUOTE' || item.service === 'OPTION') {
    item.content.forEach((quote) => {
      let lastQuote: IStreamerData = {};
      if (streamedData[quote.key]) {
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
      };
      streamedData[value.symbol].push(value);
      // if (currentlyStreamedEquityNames.includes(value.symbol)) {
      //   if (!valuesToBePersisted[value.symbol]) {
      //     valuesToBePersisted[value.symbol] = [];
      //   }
      //   valuesToBePersisted[value.symbol].push(value);
      //   if (valuesToBePersisted[value.symbol].length > 10) {
      //     // Only persist every few values and the mark is the average value of those items.
      //     value.mark = valuesToBePersisted[value.symbol].reduce((a, b) => a + b.mark, 0) / valuesToBePersisted[value.symbol].length;
      //     // StreamedData.upsert(Constants.streamedDataId, {$addToSet: {[value.symbol]: value}});
      //     valuesToBePersisted[value.symbol] = [];
      //   }
      // }
    });
  }
}

function afterHours() {
  const now = new Date();
  const settings = AppSettings.findOne(Constants.appSettingsId);
  return (
    (now.getHours() > settings.endOfDayHourNY) ||
    (now.getHours() === settings.endOfDayHourNY && now.getMinutes() > settings.endOfDayMinuteNY)
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
  CloseWebSocket();
  eraseAllData();
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
      if (afterHours()) {
        CloseWebSocket();
        return;
      }
      const data = JSON.parse(evt.data);
      if (data?.response && data.response[0]?.content?.code === 0 && data.response[0]?.command === "LOGIN") {
        console.log("Streaming Logged In");
        isWsOpen = true;
        AddEquitiesToStream('QQQ');
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
      console.log("WebSocket CLOSED.");
    };

    mySock.onopen = function (evt) {
      mySock.send(JSON.stringify(loginRequest));
    };

    mySock.on('error', (reason) => console.error(`WebSocket Error of: ${reason}`));

    return await waitForLogin();
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
  return {mark: 0, symbol: symbol};
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
    result = CalculateOptionsPricings(result, leg, quote.mark);
  });
  return result;
}

export {
  PrepareStreaming,
  CloseWebSocket,
  LatestQuote,
  AddOptionsToStream,
  IsStreamingQuotes,
  GetStreamingOptionsPrice,
  AddEquitiesToStream,
};