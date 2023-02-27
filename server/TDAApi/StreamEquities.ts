import WebSocket from 'ws';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
import {GetUserPrinciples} from './TDAApi';
import _ from 'lodash';
import ITradeSettings, {BadDefaultIPrice, IPrice} from '../../imports/Interfaces/ITradeSettings';
import ILegSettings, {BuySell, OptionType} from '../../imports/Interfaces/ILegSettings';
import CalculateOptionsPricings from '../CalculateOptionsPricing';

let isWsOpen = false;
const streamedData = {};

// Utility
function jsonToQueryString(json) {
  return Object.keys(json).map(function (key) {
    return encodeURIComponent(key) + '=' +
      encodeURIComponent(json[key]);
  }).join('&');
}

interface IStreamerData {
  symbol?: string;
  mark?: number;
  volume?: number;
  volatility?: number;
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
      const value = {
        symbol: quote.key,
        mark: quote[49] ?? quote[41] ?? lastQuote.mark,
        volume: quote[8] ?? lastQuote.volume ?? 0,
        volatility: quote[24] ?? lastQuote.volatility ?? 0,
        when: new Date(item.timestamp),
      };
      streamedData[value.symbol].push(value);
      console.log(`WS: ${value.symbol}: mark: ${value.mark}, volatility: ${value.volatility}, volume: ${value.volume}, count: ${streamedData[value.symbol].length}`);
    });
  }
}

async function PrepareStreaming() {
  CloseWebSocket();
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

    mySock.onmessage = function (evt) {
      const data = JSON.parse(evt.data);
      if (data?.response && data.response[0]?.content?.code === 0 && data.response[0]?.command === "LOGIN") {
        isWsOpen = true;
        console.log("Streaming Logged In");
        AddEquitiesToStream('QQQ');
      }
      if (data && _.isArray(data.data)) {
        data.data.forEach((item) => {
          recordQuoteData(item);
        });
      }
    };

    mySock.onclose = function (evt) {
      mySock = null;
      isWsOpen = false;
      console.log("WebSocket CLOSED.");
    };

    mySock.onopen = function (evt) {
      isWsOpen = true;
      console.log("WebSocket OPENED.");
      mySock.send(JSON.stringify(loginRequest));
    };

    mySock.on('error', (reason) => console.error(`WebSocket Error of: ${reason}`));

    return true;
  }
  return false;
}

const currentSymbols = [];

function buildOptionNames(names:string): string {
  const symbols = names.split(',');
  symbols.forEach((symbol) => {
    if (!currentSymbols.includes(symbol)) {
      currentSymbols.push(symbol);
    }
    });
  return currentSymbols.join(',');
}

function AddEquitiesToStream(equityNames: string) {
  if (isWsOpen) {
    const requestQuotes = {
      requests: [
        {
          service: 'QUOTE',
          requestid: incrementRequestId(),
          command: 'SUBS',
          account: userPrincipalsResponse.accounts[0].accountId,
          source: userPrincipalsResponse.streamerInfo.appId,
          parameters: {
            keys: equityNames,
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
  }
}

function AddOptionsToStream(optionNames: string) {
  if (isWsOpen) {
    const requestOptionQuotes = {
      requests: [
        {
          service: 'OPTION',
          requestid: incrementRequestId(),
          command: 'SUBS',
          account: userPrincipalsResponse.accounts[0].accountId,
          source: userPrincipalsResponse.streamerInfo.appId,
          parameters: {
            keys: buildOptionNames(optionNames),
            // 0: Symbol
            // 8: Cumulative daily volume
            // 41: Mark Price
            fields: '0,8,41',
          },
        },
      ]
    };
    mySock.send(JSON.stringify(requestOptionQuotes));
  }
}

function LatestQuote(symbol: string): IStreamerData {
  if (streamedData[symbol]) {
    return streamedData[symbol][streamedData[symbol].length - 1];
  }
  return null;
}

function IsStreamingQuotes() {
  return isWsOpen;
}

function GetStreamingPrice(tradeSettings: ITradeSettings) {
  const result = {...BadDefaultIPrice, price: 0, whenNY: new Date()};
  if (!IsStreamingQuotes()) {
    return result;
  }
  result.underlyingPrice = LatestQuote(tradeSettings.symbol).mark;
  tradeSettings.legs.forEach((leg) => {
    const quote = LatestQuote(leg.option.symbol);
    CalculateOptionsPricings(result, leg, quote.mark);
  });
  return result;
}

export {PrepareStreaming, CloseWebSocket, LatestQuote, AddOptionsToStream, IsStreamingQuotes, GetStreamingPrice, AddEquitiesToStream};