import {Meteor} from 'meteor/meteor';
import './collections/stockData';
import './collections/straddleData';
import './collections/Backtests';
import './collections/TradeSettingsSets';
import './collections/Ranges';
import {
  DeleteUserTradeSettingsRecord,
  GetNewUserTradeSettingsRecord,
  GetTradeSettingNames,
  GetTradeSettingsFromSetMethod,
  GetUserTradeSettings,
  SetUserTradeSettings,
  TradeSettings
} from './collections/TradeSettings';
import './collections/UserSettings';
import {GetUserSettings, ResetUsersMaxDailyGainSettings, SaveUserSettings} from './collections/UserSettings';
import './SeedUser';
import {
  BuyStock,
  GetAccessToken,
  GetATMOptionChains,
  GetOrders,
  SellStraddle,
  SetUserAccessInfo
} from './TDAApi/TDAApi';
import {EmergencyCloseAllTrades, EmergencyCloseSingleTrade, ExecuteTrade} from './Trader';
import {WebApp} from 'meteor/webapp';
import {AppSettings, GetAppSettings, SetAppSettings} from './collections/AppSettings';
import Constants from '../imports/Constants';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import './TDAApi/StreamEquities';
import {GetSlopeAngleOfSymbol, LatestQuote} from './TDAApi/StreamEquities';
import {DefaultAppSettings} from '../imports/Interfaces/IAppSettings';
import {GetSPXData, StartBackgroundPolling} from './BackgroundPolling';
import ScheduleEndOfDayWork from './ScheduleEndOfDayWork';
import ScheduleStartOfDayWork from './ScheduleStartOfDayWork';
import {
  BackTestCallPut,
  BacktestMethodEntryPoint,
  ResetBacktester,
  ToggleBacktestingIsOn
} from "./Backtest/SingleCallPutBacktest";
import PerformSystemMaintenance from "./PerformSystemMaintenance";
import {GetTradeSettingsInfoFromSetId} from './collections/TradeSettingsSets';
import {GetBacktestTradesFromIds} from './collections/Backtests';

import './EODHdApi/ConvertTickDataToCandle.ts';
import {GetDailyTradeSummariesForUserAndDayRange} from './collections/DailyTradeSummaries';

dayjs.extend(utc);
dayjs.extend(timezone);


// Listen to incoming HTTP requests (can only be used on the server).
WebApp.connectHandlers.use('/traderOAuthCallback', (req, res) => {
  res.writeHead(200);
  res.end(`Trader received a redirect callback. Received new access code: \n${decodeURI(req.query?.code)}`);
});

function TestStrategy(tradeSettingsId) {
  if (!Meteor.userId()) {
    throw new Meteor.Error('Must have valid user in TestStrategy.');
  }
  const forceTheTrade = true;
  const tradeSettings = TradeSettings.findOne(tradeSettingsId);
  ExecuteTrade(tradeSettings, forceTheTrade, tradeSettings.isPrerun, tradeSettings.isPrerunVIXSlope, tradeSettings.isPrerunGainLimit).then();
}

function ResetAnyLiveTradesWithIsBusyClosingTradeFlag() {
  const liveTrades = TradeSettings.find({userId: Meteor.userId(), isBusyClosingTrade: true}).fetch();
  liveTrades.forEach((trade) => {
    TradeSettings.update(trade._id, {$set: {isBusyClosingTrade: false}});
  });
}

Meteor.methods({
    SetUserAccessInfo,
    GetAccessToken,
    GetOrders,
    GetUserSettings,
    SaveUserSettings,
    SetUserTradeSettings,
    GetUserTradeSettings,
    GetTradeSettingNames,
    GetTradeSettingsFromSetMethod,
    GetNewUserTradeSettingsRecord,
    DeleteUserTradeSettingsRecord,
    BuyStock,
    SellStraddle,
    GetATMOptionChains,
    TestStrategy,
    EmergencyCloseAllTrades,
    EmergencyCloseSingleTrade,
    GetSlopeAngleOfSymbol,
    LatestQuote,
    GetAppSettings,
    SetAppSettings,
    ResetUsersMaxDailyGainSettings,
    GetSPXData,
    BackTestCallPut,
    BacktestMethodEntryPoint,
    GetTradeSettingsInfoFromSetId,
    GetBacktestTradesFromIds,
    ToggleBacktestingIsOn,
    ResetBacktester,
    GetDailyTradeSummariesForUserAndDayRange,
  }
);

console.log(`Current local time is ${new Date()}.`);

// Define the AppSettings record if not there already. Let DB record values override defaults.
const settings = {
  ...DefaultAppSettings,
  ...AppSettings.findOne(Constants.appSettingsId),
};
delete settings._id;
AppSettings.upsert(Constants.appSettingsId, settings);
PerformSystemMaintenance();
ResetAnyLiveTradesWithIsBusyClosingTradeFlag();

// GetTickDataForDay('SPY', dayjs('2023-12-18')).catch((e) => console.log(e));

ResetBacktester();
StartBackgroundPolling();
ScheduleStartOfDayWork();
ScheduleEndOfDayWork();


