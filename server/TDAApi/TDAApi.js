import {Meteor} from 'meteor/meteor';
import _ from 'lodash';
import {fetch} from 'meteor/fetch';
import dayjs from 'dayjs';
import BuyStockOrderForm from './Templates/BuyStockOrderForm';
import SellStraddleOrderForm from './Templates/SellStraddleOrderForm';
import {Users} from '../collections/users';
import GetOptionOrderBuysTriggeringSells from './Templates/GetOptionOrderBuysTriggeringSells';
import {BuySell, OptionType} from '../../imports/Interfaces/ILegSettings';
import {LogData} from '../collections/Logs';
import {IronCondorMarketOrder} from './Templates/SellIronCondorOrder';
import {BadDefaultIPrice} from '../../imports/Interfaces/ITradeSettings';
import Constants from '../../imports/Constants';
import {CalculateTradePrice, InTradeHours} from '../../imports/Utils';

const clientId = '8MXX4ODNOEKHOU0COANPEZIETKPXJRQZ@AMER.OAUTHAP';
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
      const msg = `Error: SetUserAccessInfo method status is: ${response.status} ${response.statusText}`;
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
    const msg = `Error: GetNewAccessToken method status is: ${response.status} ${response.statusText}`;
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
    'services.tda.refreshTokenExpiresAt': dayjs().add(data.refresh_token_expires_in, 'second').valueOf(),
  };
  Users.update({_id: userId}, {$set: settings});
  return accessToken;
}

export async function GetAccessToken(userId) {
  let accessInfo = {};
  if (userId) {
    accessInfo = Users.findOne(userId)?.services?.tda;
  } else {
    accessInfo = Meteor.user()?.services?.tda;
  }
  let result = null;
  if (accessInfo) {
    try {
      // First see if refreshToken is expiring soon or has.
      let now = dayjs().add(10, 'day');
      let expireTime = dayjs(accessInfo.refreshTokenExpiresAt);
      if (now.isAfter(expireTime)) {
        LogData(null, `User ID: ${userId}, ACCESS TOKEN AND REFRESH TOKEN IS BEING UPDATED. Should be rare (about 90-days).    ##################`);
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

export async function GetUserPrinciples(userId) {
  try {
    const token = await GetAccessToken(userId ?? Meteor.userId());
    if (!token) return null;
    const url = `https://api.tdameritrade.com/v1/userprincipals/?fields=streamerSubscriptionKeys,streamerConnectionInfo`;
    const options = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      }
    };
    const response = await fetch(url, options);
    if (response.status !== 200) {
      LogData(null, `TDAApi.GetUserPrinciples fetch returned: userId:${userId}, ${response.status} ${response}.`);
      return null;
    }
    const results = await response.json();
    return results;
  } catch (error) {
    LogData(null, `TDAApi.GetUserPrinciples: userId:${userId}.`, error);
  }
}


export async function GetOrders(userId, accountNumber = '755541528', orderId) {
  try {
    const token = await GetAccessToken(userId ?? Meteor.userId());
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
    if (response.status !== 200) {
      LogData(null, `TDAApi.GetOrders fetch returned: userId:${userId}, ${response.status} ${response}, accountNumber: ${accountNumber}`);
      return null;
    }
    const orders = await response.json();
    return orders;
  } catch (error) {
    LogData(null, `TDAApi.GetOrders: userId:${userId}, accountNumber: ${accountNumber}`, error);
  }
}

export async function GetHistoricalData(userId, symbol, date) {
  try {
    const token = await GetAccessToken(userId);
    if (!token) {
      return null;
    }
    const queryParams = new URLSearchParams({
      startDate: date.toDate().getTime(),
      endDate: date.toDate().getTime(),
      periodType: 'day',
      frequencyType: 'minute',
      frequency: '1',
      needExtendedHoursData: 'false',
    });
    const url = `https://api.tdameritrade.com/v1/marketdata/${symbol}/pricehistory?${queryParams}`;
    const options = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },

    };
    const response = await fetch(url, options);
    if (response.status === 400) {
      return null; // No data for this date (weekend or holiday).
    }
    if (response.status !== 200) {
      LogData(null, `TDAApi.GetHistoricalData fetch returned: userId:${userId}, ${response.status} ${response}.`);
      return null;
    }
    const data = await response.json();
    if (data?.empty) {
      return null;
    }
    return data?.candles ?? null;
  } catch (error) {
    LogData(null, `TDAApi.GetHistoricalData: userId:${userId}:`, error);
    return null;
  }
}

// Returns a Promise that resolves after "ms" Milliseconds
export const WaitMs = ms => new Promise(res => setTimeout(res, ms));

/**
 * The function returns an object containing all the resulting data.
 *
 * @param tradeSettings
 * @returns {Promise<IPrice>}
 * @constructor
 */
export async function GetPriceForOptions(tradeSettings) {
  try {
    const token = await GetAccessToken(tradeSettings.userId);
    if (!token) return {...BadDefaultIPrice};
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
      return {...BadDefaultIPrice};
    }
    const quotesData = await response.json();
    const quotes = Object.values(quotesData);
    if (quotes?.length === 1 && _.isString(quotes[0]) && quotes[0].includes('transactions per seconds restriction')) {
      console.error(`GetPriceForOptions: Transactions for price check are too fast per second...`);
      return {...BadDefaultIPrice};
    }
    if (!quotes || quotes?.length === 0) {
      return {...BadDefaultIPrice};
    }
    return CalculateTradePrice(tradeSettings, quotes);
  } catch (error) {
    const msg = `TDAApi.GetPriceForOptions: failed with: ${error}`;
    console.error(msg);
    return {...BadDefaultIPrice};
  }
}

export async function GetPriceForSymbols(userId, symbols) {
  try {
    const token = await GetAccessToken(userId);
    if (!token) return [];
    const queryParams = new URLSearchParams({
      symbol: symbols,
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
      const msg = `Error: GetPriceForSymbols ('${symbols}') fetch called failed. status: ${response.status}, ${JSON.stringify(response)}`;
      console.error(msg);
      return [];
    }
    const quotesData = await response.json();
    const quotes = Object.values(quotesData);
    if (quotes?.length === 1 && _.isString(quotes[0]) && quotes[0].includes('transactions per seconds restriction')) {
      console.error(`GetPriceForSymbols: Transactions for price check are too fast per second...`);
      return [];
    }
    if (!quotes || quotes?.length === 0) {
      return [];
    }
    return quotes;
  } catch (error) {
    const msg = `TDAApi.GetPriceForSymbols: failed with: ${error}`;
    console.error(msg);
    return [];
  }
}

export async function GetATMOptionChains(tradeSettings) {
  if (tradeSettings.isBacktesting) {
    return [];
  }
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
  if (!InTradeHours()) {
    console.log(`IsOptionMarketOpenToday: Not in trade hours.`);
    return false;
  }
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
    const msg = `Error: IsOptionMarketOpen method status is: ${response.status} for user ${userId}`;
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
  // First define lastOption to be a valid option with a delta value.
  let lastOption = items[0][0];
  let startCnt = 1;
  while (lastOption.delta === Number.NaN && startCnt < items.length) {
    lastOption = items[startCnt][0];
    startCnt++;
  }
  // Now find the first option that is at or below the desired delta.
  for (let i = startCnt; i < items.length; i++) {
    const option = items[i][0];
    if (option.delta !== 0.0 && option.delta !== Number.NaN) {
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
  console.error(`*******    LISTING OPTION DELTAS: ${msg}`);
  for (let i = 0; i < items.length; i++) {
    const option = items[i][0];
    console.error(`getOptionAtDelta delta= ${option.delta}`);
  }
  console.error(`*******    END: ${msg}`);
  throw new Meteor.Error(msg);
}

function getOptionChainsAtOrNearDTE(chains, dte) {
  // Get the DTE-specific option set.
  const putNames = Object.getOwnPropertyNames(chains.putExpDateMap);
  let chainName = null;
  // The goal here is to get the exact DTE. If not then try
  // one less. If not then
  // try DTE+1 all the way up to DTE+5.
  // First match wins.
  // We are also avoiding 1 DTE because it is not reliable from OptionOmega studies.
  chainName = putNames.find((name) => name.endsWith(`:${dte}`));
  if (!chainName && (dte - 1) > 1) { // Avoiding 1 DTE.
    chainName = putNames.find((name) => name.endsWith(`:${dte - 1}`));
  }
  let count = 1;
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
  const dteValue = chainName.slice(chainName.indexOf(':') + 1);
  return {putsChain, callsChain, dteValue};
}

export function CreateOpenAndCloseOrders(chains, tradeSettings) {
  let csvSymbols = ``;
  let openingPrice = 0.0;
  let shortOnlyPrice = 0.0;
  tradeSettings.openingUnderlyingPrice = chains?.underlying?.mark ?? 0.0;
  // For each leg, find the closest option based on Delta
  tradeSettings.legs.forEach((leg) => {
    const {putsChain, callsChain, dteValue} = getOptionChainsAtOrNearDTE(chains, leg.dte);
    leg.actualDte = dteValue;
    if (leg.callPut === OptionType.CALL) {
      leg.option = getOptionAtDelta(callsChain, leg.delta);
    } else {
      leg.option = getOptionAtDelta(putsChain, leg.delta);
    }
    if (!csvSymbols.includes(leg.option.symbol)) {
      csvSymbols = `${csvSymbols},${leg.option.symbol}`;
    }

    let totalMarkPrice = 0;
    // We have tried using the mark price or the bidPrice/askPrice this IF statement
    // is used to keep both chunks of code logic, so we can easily switch back and forth.
    if (Constants.usingMarkPrice) {
      totalMarkPrice = leg.option.mark * leg.quantity;
    } else {
      // Base price on the lower value relative to the opposite desired entry buySell direction.
      // This is because entry is simply a time point while exit is based on value and the legs
      // define the buySell direction based on trade entry. So, do the opposite for exit.
      totalMarkPrice = leg.option.bid * leg.quantity;
      if (leg.buySell === BuySell.SELL) {
        // Means we are buying this leg now to exit the trade.
        totalMarkPrice = leg.option.ask * leg.quantity;
      }
    }

    if (leg.buySell === BuySell.BUY) {
      openingPrice = openingPrice + totalMarkPrice;
    } else {
      openingPrice = openingPrice - totalMarkPrice;
      shortOnlyPrice = shortOnlyPrice + totalMarkPrice;
    }
  });
  tradeSettings.whenOpened = new Date();
  tradeSettings.csvSymbols = csvSymbols.slice(1); // remove leading comma
  tradeSettings.openingPrice = openingPrice; // Expected openingPrice. Will be used if isMocked. Order filled replaces.
  tradeSettings.openingShortOnlyPrice = shortOnlyPrice;
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
    tradeSettings.openingOrder = GetOptionOrderBuysTriggeringSells(tradeSettings.legs, false);
    tradeSettings.closingOrder = GetOptionOrderBuysTriggeringSells(tradeSettings.legs, true);
  }
  return true;
}