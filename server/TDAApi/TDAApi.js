import {Meteor} from 'meteor/meteor';
import _ from 'lodash';
import {fetch} from 'meteor/fetch';
import dayjs from 'dayjs';
import BuyStockOrderForm from './Templates/BuyStockOrderForm';
import SellStraddleOrderForm from './Templates/SellStraddleOrderForm';
import {Users} from '../collections/users';
import GetOptionOrderBuysTriggeringSells from './Templates/GetOptionOrderBuysTriggeringSells';
import {DefaultTradeSettings} from '../../imports/Interfaces/ITradeSettings';
import {BuySell, OptionType} from '../../imports/Interfaces/ILegSettings';
import {LogData} from "../collections/Logs";
import {IronCondorMarketOrder} from './Templates/SellIronCondorOrder';

const clientId = 'PFVYW5LYNPRZH6Y1ZCY5OTBGINDLZDW8@AMER.OAUTHAP';
const redirectUrl = 'https://localhost/traderOAuthCallback';

export async function SetUserAccessInfo(code) {
  let result = false;
  if (Meteor.user() && code) {
    let body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('access_type', 'offline');
    body.append('client_id', clientId);
    body.append('redirect_uri', redirectUrl);
    body.append('code', code);
    const url = `https://api.tdameritrade.com/v1/oauth2/token`;
    let response = null;
    const method = 'POST';
    const headers = {'Content-Type': 'application/x-www-form-urlencoded'};
    try {
      response = await fetch(url, {method, headers, body});
    } catch (ex) {
      console.error(ex);
      throw new Meteor.Error(`Failed: SetUserAccessInfo with ${ex}`);
    }
    if (response.status !== 200) {
      const msg = `Error: SetUserAccessInfo method status is: ${response.status}`;
      console.error(msg);
      throw new Meteor.Error(msg);
    }
    // Save new information into User's record.
    const data = await response.json();
    data.accessTokenExpiresAt = dayjs().add(data.expires_in, 'second').valueOf();
    data.refreshTokenExpiresAt = dayjs().add(data.refresh_token_expires_in, 'second').valueOf();
    delete data.expires_in;
    delete data.refresh_token_expires_in;
    Meteor.users.update({_id: Meteor.userId()}, {
      $set: {
        'services.tda': data,
        'services.tradeSettings': DefaultTradeSettings,
      }
    });
    result = true;
  } else {
    throw new Meteor.Error(`Invalid call without a user or code value.`);
  }
  return result;
}

async function GetNewAccessToken(userId, refreshToken) {
  let body = new URLSearchParams();
  body.append('grant_type', 'refresh_token');
  body.append('refresh_token', refreshToken);
  body.append('client_id', clientId);
  body.append('redirect_uri', redirectUrl);
  const url = `https://api.tdameritrade.com/v1/oauth2/token`;
  let response = null;
  const method = 'POST';
  const headers = {'Content-Type': 'application/x-www-form-urlencoded'};
  try {
    response = await fetch(url, {method, headers, body});
  } catch (ex) {
    console.error(ex);
    throw new Meteor.Error(`Failed: GetNewAccessToken with ${ex}`);
  }
  if (response.status !== 200) {
    if (response.status === 400) {
      console.log(`Possible security issue with account (PW changed?) for userId: ${userId}.`);
      return null;
    }
    const msg = `Error: GetNewAccessToken method status is: ${response.status}`;
    console.error(msg);
    throw new Meteor.Error(msg);
  }
  // Persist the new accessToken and return it.
  const data = await response.json();
  const accessToken = data.access_token;
  const settings = {
    'services.tda.access_token': accessToken,
    'services.tda.accessTokenExpiresAt': dayjs().add(data.expires_in, 'second').valueOf(),
  };
  Users.update({_id: userId}, {$set: settings});
  return accessToken;
  return null;
}

async function GetNewAccessAndRefreshToken(userId, currentRefreshToken) {
  let body = new URLSearchParams();
  body.append('grant_type', 'refresh_token');
  body.append('refresh_token', currentRefreshToken);
  body.append('access_type', 'offline');
  body.append('client_id', clientId);
  body.append('redirect_uri', redirectUrl);
  const url = `https://api.tdameritrade.com/v1/oauth2/token`;
  let response = null;
  const method = 'POST';
  const headers = {'Content-Type': 'application/x-www-form-urlencoded'};
  try {
    response = await fetch(url, {method, headers, body});
  } catch (ex) {
    console.error(ex);
    throw new Meteor.Error(`Failed: GetNewAccessToken with ${ex}`);
  }
  if (response.status !== 200) {
    if (response.status === 400) {
      console.log(`Possible security issue with account (PW changed?) for userId: ${userId}.`);
      return null;
    }
    const msg = `Error: GetNewAccessAndRefreshToken method status is: ${response.status}`;
    console.error(msg);
    throw new Meteor.Error(msg);
  }
  // Return resulting information for saving or use by the caller.
  const data = await response.json();
  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;
  const settings = {
    'services.tda.access_token': accessToken,
    'services.tda.refresh_token': refreshToken,
    'services.tda.accessTokenExpiresAt': dayjs().add(data.expires_in, 'second').valueOf(),
    'services.tda.refreshTokenExpiresAt': dayjs().add(data.refresh_token_expires_in, 'day').valueOf(),
  };
  Users.update({_id: userId}, {$set: settings});
  return accessToken;
  return null;
}

export async function GetAccessToken(userId) {
  let accessInfo = {};
  if (userId) {
    accessInfo = Users.findOne(userId)?.services?.tda;
  } else {
    accessInfo = Meteor.user()?.services?.tda;
    userId = Meteor.userId();
  }
  let result = null;
  if (accessInfo) {
    try {
      // First see if refreshToken is expiring soon or has.
      let now = dayjs().add(10, 'day');
      let expireTime = dayjs(accessInfo.refreshTokenExpiresAt);
      if (now.isAfter(expireTime)) {
        return await GetNewAccessAndRefreshToken(userId, accessInfo.refresh_token);
      }
      // Second, see if accessToken is expiring soon or has.
      now = dayjs().add(5, 'second');
      expireTime = dayjs(accessInfo.accessTokenExpiresAt);
      if (now.isAfter(expireTime)) {
        return await GetNewAccessToken(userId, accessInfo.refresh_token);
      }
      // Current access token is good.
      return accessInfo.access_token;
    } catch (ex) {
      throw new Meteor.Error(`GetAccessToken: ${ex}`);
    }
  }
  return result;
}


export async function GetOrders(userId, accountNumber = '755541528', orderId) {
  try {
    userId = userId || Meteor.userId();
    const token = await GetAccessToken(userId);
    if (!token) return null;
    let orderIdPart = '';
    if (orderId) {
      orderIdPart = `/${orderId}`;
    }
    const url = `https://api.tdameritrade.com/v1/accounts/${accountNumber}/orders${orderIdPart}`;
    const options = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      }
    };
    const response = await fetch(url, options);
    const orders = await response.json();
    return orders;
  } catch (error) {
    LogData(null, `TDAApi.GetOrders: tokenId:${tokenId}, accountNumber: ${accountNumber}`, error);
  }
}

// Returns a Promise that resolves after "ms" Milliseconds
export const WaitMs = ms => new Promise(res => setTimeout(res, ms));

export async function GetPriceForOptions(tradeSettings) {
  try {
    const token = await GetAccessToken(tradeSettings.userId);
    if (!token) return null;
    const queryParams = new URLSearchParams({
      symbol: tradeSettings.csvSymbols,
      apikey: clientId,
    });
    const url = `https://api.tdameritrade.com/v1/marketdata/quotes?${queryParams}`;
    const fetchOptions = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      }
    };
    const response = await fetch(url, fetchOptions);
    if (response.status !== 200) {
      const msg = `Error: GetPriceForOptions fetch called failed. status: ${response.status}, ${JSON.stringify(response)}`;
      console.error(msg);
      return {currentPrice: Number.NaN, quoteTime: dayjs()};
    }
    const quotesData = await response.json();
    // Now scan the quotes and add/subtract up the price.
    let currentPrice = 0;
    const quotes = Object.values(quotesData);
    if (quotes?.length === 1 && _.isString(quotes[0]) && quotes[0].includes('transactions per seconds restriction')) {
      console.error(`GetPriceForOptions: Transactions for price check are too fast per second...`);
      return {currentPrice: Number.NaN, quoteTime: dayjs()};
    }
    quotes.forEach((quote) => {
      const leg = tradeSettings.legs.find((leg) => leg.option.symbol === quote.symbol);
      // Below does the opposite math because we have already Opened these options, so we are looking at
      // "TO_CLOSE" pricing where we buy back something we sold and sell something we previously purchased.
      if (leg.buySell === BuySell.BUY) {
        currentPrice = currentPrice - quote.mark;
      } else {
        currentPrice = currentPrice + quote.mark;
      }
    });
    // Get quote time in local hours.
    const quoteTime = dayjs();
    return {currentPrice, quoteTime};
  } catch (error) {
    const msg = `TDAApi.GetPriceForOptions: failed with: ${error}`;
    console.error(msg);
    return {currentPrice: Number.NaN, quoteTime: dayjs()};
  }
}

export async function GetATMOptionChains(tradeSettings) {
  const {symbol, userId} = tradeSettings;
  const token = await GetAccessToken(userId);
  if (!token) {
    throw new Meteor.Error('GetATMOptionChains: No access token available.');
  }
  let maxDte = 0;
  tradeSettings.legs.forEach((leg) => maxDte = Math.max(maxDte, leg.dte));
  const weekendDays = (Math.round(maxDte / 7) * 2) + 5;
  const fromDate = dayjs().subtract(1, 'day');
  const toDate = dayjs().add(maxDte + weekendDays, 'day');
  const queryParams = new URLSearchParams({
    symbol,
    range: 'ALL',
    includeQuotes: 'TRUE',
    fromDate: fromDate.format('YYYY-MM-DD'),
    toDate: toDate.format('YYYY-MM-DD'),
    strikeCount: 40,
  });
  const url = `https://api.tdameritrade.com/v1/marketdata/chains?${queryParams}`;
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const response = await fetch(url, options);
  if (!response.ok || response.status !== 200) {
    const msg = `Error: GetATMOptionChains method status: ${response.status}, ok: ${response.ok}, response: ${response}`;
    throw new Meteor.Error(msg);
  }
  const chains = await response.json();
  return chains;
}

export async function PlaceOrder(userId, accountNumber, order) {
  const token = await GetAccessToken(userId);
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(order),
  };
  const response = await fetch(`https://api.tdameritrade.com/v1/accounts/${accountNumber}/orders`, options);
  if (!response.ok) {
    const msg = `Error: PlaceOrder method status is: ${response.status}\n${JSON.stringify(order)}`;
    console.error(msg);
    throw new Meteor.Error(msg);
  }
  // Get the returned order ID from the 'location' URI provided in the header.
  const location = response.headers.get('location');
  const index = location?.lastIndexOf('/');
  const orderId = location?.substring(index + 1);
  return orderId;
}

export async function IsOptionMarketOpenToday(userId) {
  const token = await GetAccessToken(userId);
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  };
  const dateText = dayjs().format('YYYY-MM-DD');
  const response = await fetch(`https://api.tdameritrade.com/v1/marketdata/OPTION/hours?date=${dateText}`, options);
  if (!response.ok) {
    const msg = `Error: IsOptionMarketOpen method status is: ${response.status}`;
    LogData(null, msg, new Error(msg));
    return false;
  }
  const results = await response.json();
  return results?.option?.EQO?.isOpen || false;
}

export async function BuyStock(accountNumber, stockSymbol, quantity) {
  if (!Meteor.user()) throw new Meteor.Error(`BuyStock requires a logged in user.`);
  const order = BuyStockOrderForm(stockSymbol, quantity);
  return PlaceOrder(Meteor.userId(), accountNumber, order);
}

export async function SellStraddle(accountNumber, stockSymbol, quantity) {
  if (!Meteor.user()) throw new Meteor.Error(`SellStraddle requires a logged in user.`);
  const order = SellStraddleOrderForm(stockSymbol, quantity);
  return PlaceOrder(Meteor.userId(), accountNumber, order);
}

function pickClosest(option, lastOption, desiredDelta) {
  // Now pick closer one.
  const diffLast = Math.abs(Math.abs(lastOption.delta) - Math.abs(desiredDelta));
  const diffCurrent = Math.abs(Math.abs(option.delta) - Math.abs(desiredDelta));
  if (diffLast < diffCurrent) {
    return lastOption;
  }
  return option;
}

function getOptionAtDelta(options, desiredDelta) {
  const items = Object.values(options);
  let lastOption = items[0][0];
  for (let i = 1; i < items.length; i++) {
    const option = items[i][0];
    if (option.delta !== 0.0) {
      if (option.putCall === 'PUT') {
        if (Math.abs(option.delta) >= desiredDelta) {
          return pickClosest(option, lastOption, desiredDelta);
        }
      } else {
        if (option.delta <= desiredDelta) {
          return pickClosest(option, lastOption, desiredDelta);
        }
      }
    }
    lastOption = option;
  }
  const msg = `NoOption: getOptionAtDelta delta: ${desiredDelta}. Options: ${JSON.stringify(options)}`;
  throw new Meteor.Error(msg);
}

function getOptionChainsAtOrNearDelta(chains, dte) {
  // Get the DTE-specific option set.
  const putNames = Object.getOwnPropertyNames(chains.putExpDateMap);
  let chainName = null;
  let count = 0;
  while (!chainName && count < 5) {
    chainName = putNames.find((name) => name.endsWith(`:${dte + count}`));
    count++;
  }
  if (!chainName) {
    const msg = `Failed in 'getOptionChainAtOrNearDelta': putNames: ${putNames}, dte: ${dte}.`;
    throw new Meteor.Error(msg);
  }
  const putsChain = chains.putExpDateMap[chainName];
  const callsChain = chains.callExpDateMap[chainName]; // Same name for both is correct.
  return {putsChain, callsChain};
}

export function CreateOpenAndCloseOrders(chains, tradeSettings) {
  // For each leg, find the closest option based on Delta
  let csvSymbols = '';
  let openingPrice = 0.0;
  tradeSettings.legs.forEach((leg) => {
    const {putsChain, callsChain} = getOptionChainsAtOrNearDelta(chains, leg.dte);
    if (leg.callPut === OptionType.CALL) {
      leg.option = getOptionAtDelta(callsChain, leg.delta);
    } else {
      leg.option = getOptionAtDelta(putsChain, leg.delta);
    }
    if (!csvSymbols.includes(leg.option.symbol)) {
      csvSymbols = `${csvSymbols},${leg.option.symbol}`;
    }
    if (leg.buySell === BuySell.BUY) {
      openingPrice = openingPrice + leg.option.mark;
    } else {
      openingPrice = openingPrice - leg.option.mark;
    }
  });
  tradeSettings.csvSymbols = csvSymbols.slice(1); // Remove leading comma and save for later.
  tradeSettings.openingPrice = openingPrice; // Expected openingPrice. Will be used if isMocked. Order filled replaces.
  if (tradeSettings.tradeType?.length > 0) {
    if (tradeSettings.tradeType[0] === 'IC') {
      // Create Iron Condor orders to open and to close.
      tradeSettings.openingOrder = IronCondorMarketOrder(tradeSettings, true);
      tradeSettings.closingOrder = IronCondorMarketOrder(tradeSettings, false);
    }
    if (tradeSettings.tradeType[0] === 'CS') {
      // Create Double Diagonal orders to open and to close.
      tradeSettings.openingOrder = IronCondorMarketOrder(tradeSettings, true);
      tradeSettings.openingOrder.complexOrderStrategyType = 'DOUBLE_DIAGONAL';
      tradeSettings.closingOrder = IronCondorMarketOrder(tradeSettings, false);
      tradeSettings.closingOrder.complexOrderStrategyType = 'DOUBLE_DIAGONAL';
    }
  } else {
    // Create market orders for open and close by having buys triggering the sell items.
    tradeSettings.openingOrder = GetOptionOrderBuysTriggeringSells(tradeSettings.legs, tradeSettings.quantity, false);
    tradeSettings.closingOrder = GetOptionOrderBuysTriggeringSells(tradeSettings.legs, tradeSettings.quantity, true);
  }
  return true;
}