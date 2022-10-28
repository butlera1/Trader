import {Meteor} from 'meteor/meteor';
import {fetch} from 'meteor/fetch';
import dayjs from 'dayjs';
import BuyStockOrderForm from './Templates/BuyStockOrderForm';
import SellStraddleOrderForm from './Templates/SellStraddleOrderForm';
import {IronCondorMarketOrder} from './Templates/SellIronCondorOrder';
import {Users} from '../collections/users';
import optionOrderForm from './Templates/OptionOrderForm';
import {DefaultTradeSettings} from '../../imports/Interfaces/ITradeSettings';

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
    console.log(`ORDERS:\n ${JSON.stringify(orders)}`);
    return orders;
  } catch (error) {
    console.error(error);
    console.error(`TDAApi.GetOrders: tokenId:${tokenId}, accountNumber: ${accountNumber}`);
  }
}

export async function GetPriceForOptions(userId, options) {
  try {
    const token = await GetAccessToken(userId);
    if (!token) return null;
    let symbol = '';
    const optionsArray = Object.values(options);
    optionsArray.forEach((option) => symbol += `,${option.symbol}`);
    symbol = symbol.slice(1); // Remove leading comma
    const queryParams = new URLSearchParams({
      symbol,
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
    const quotesData = await response.json();
    // Now scan the quotes and add/subtract up the price.
    let currentPrice = 0;
    const quotes = Object.values(quotesData);
    quotes.forEach((quote) => {
      const option = optionsArray.find((item) => item.symbol === quote.symbol);
      if (option.isBuy) {
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
    throw new Meteor.Error(msg);
  }
}

export async function GetATMOptionChains(symbol, userId) {
    const token = await GetAccessToken(userId);
    if (!token) return null;
    const fromDate = dayjs().subtract(1, 'day');
    const toDate = dayjs().add(2, 'day');
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
    if (!response.ok) {
      const msg = `Error: GetATMOptionChains method status is: ${response.status}`;
      console.error(msg);
      throw new Meteor.Error(msg);
    }
    const chains = await response.json();
    return chains;
}

export async function PlaceOrder(userId, accountNumber, order) {
  try {
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
      const msg = `Error: PlaceOrder method status is: ${response.status}`;
      console.error(msg);
      throw new Meteor.Error(msg);
    }
    // Get the returned order ID from the 'location' URI provided in the header.
    const location = response.headers.get('location');
    const index = location?.lastIndexOf('/');
    const orderId = location?.substring(index + 1);
    return orderId;
  } catch (error) {
    const msg = `TDAApi.PlaceOrder: account: ${accountNumber}: ${error}`;
    console.error(msg);
    throw new Meteor.Error(msg);
  }
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
    console.error(msg);
    throw new Meteor.Error(msg);
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
      if (option.delta <= desiredDelta) {
        return pickClosest(option, lastOption, desiredDelta);
      }
    }
    lastOption = option;
  }
  return null;
}

function getAveragePrice(option) {
  if (option) {
    option.midPrice = (option.bid + option.ask) / 2.0;
    return option.midPrice;
  }
  console.error('Missing option to calculate midPrice for.');
  return 0.0;
}

function getCreditOnIC(buyCall, sellCall, buyPut, sellPut) {
  const buyCallPrice = getAveragePrice(buyCall);
  const sellCallPrice = getAveragePrice(sellCall);
  const buyPutPrice = getAveragePrice(buyPut);
  const sellPutPrice = getAveragePrice(sellPut);
  return sellCallPrice + sellPutPrice - buyCallPrice - buyPutPrice;
}

function GetICLegClosingMarketOrders(buyCall, sellCall, buyPut, sellPut, quantity){
  let isToClose = true;
  let isBuy = true;
  const buys = [optionOrderForm(buyCall.symbol, quantity, isToClose, isBuy), optionOrderForm(buyPut.symbol, quantity, isToClose, isBuy)];
  isBuy = false;
  const sells = [optionOrderForm(sellCall.symbol, quantity, isToClose, isBuy), optionOrderForm(sellPut.symbol, quantity, isToClose, isBuy)];
  return {buys, sells};
}

export function GetIronCondorTradeOrders(chains, tradeSettings) {
  const {quantity, desiredDelta, percentGain, percentLoss} = tradeSettings;
  // Get the shorted DTE option set.
  const putNames = Object.getOwnPropertyNames(chains.putExpDateMap);
  let putsName = '';
  if (putNames.length === 2) {
    putsName = putNames.find((name) => name.includes(':0'));
  } else {
    putsName = putNames[0];
  }
  const puts = chains.putExpDateMap[putsName];
  const calls = chains.callExpDateMap[putsName]; // Same name for both is correct.
  // Find the legs at about desireDelta.
  const buyCall = getOptionAtDelta(calls, 0.02);
  const sellCall = getOptionAtDelta(calls, desiredDelta);
  const buyPut = getOptionAtDelta(puts, -0.02);
  const sellPut = getOptionAtDelta(puts, -desiredDelta);
  if (!(buyCall && sellCall && buyPut && sellPut)) {
    throw new Meteor.Error('GetIronCondorTradeOrder: Could not get all IC legs to form the trade.');
  }
  // Calculate expected credit
  const credit = getCreditOnIC(buyCall, sellCall, buyPut, sellPut);
  const gainLimit = Math.trunc(credit * (1.0 - percentGain) * 100) / 100.0; // gain
  const lossLimit = Math.trunc(credit * (1.0 + percentLoss) * 100) / 100.0; // loss limit
  const openingOrder = IronCondorMarketOrder(buyCall, sellCall, buyPut, sellPut, quantity, true);
  const closingOrder = IronCondorMarketOrder(sellCall, buyCall, sellPut, buyPut, quantity, false);
  const closingLegOrders = GetICLegClosingMarketOrders(sellCall, buyCall, sellPut, buyPut, quantity);
  buyCall.isBuy = true;
  buyPut.isBuy = true;
  sellCall.isBuy = false;
  sellPut.isBuy = false;
  const options = {buyCall, sellCall, buyPut, sellPut};
  return {openingOrder, closingLegOrders, options};
}
