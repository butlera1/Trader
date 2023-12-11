import {Meteor} from 'meteor/meteor';
import './collections/stockData';
import './collections/straddleData';
import './collections/BacktestTrades'
import './collections/TradeSettingsSets';
import {
  DeleteUserTradeSettingsRecord,
  GetTradeSettingsFromSet,
  GetNewUserTradeSettingsRecord,
  GetTradeSettingNames,
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
import {EmergencyCloseAllTrades, EmergencyCloseSingleTrade, ExecuteTrade, MonitorTradeToCloseItOut} from './Trader';
import {WebApp} from 'meteor/webapp';
import {Trades} from './collections/Trades';
import {LogData} from './collections/Logs';
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
import {BackTestCallPut} from "./Backtest/SingleCallPutBacktest";
import PerformSystemMaintenance from "./PerformSystemMaintenance";

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

function CheckForAnyExistingTradesAndMonitorThem() {
  console.log(`Checking for existing trades...`);
  // Find all live trades for this user.
  const liveTrades = Trades.find({whyClosed: {$exists: false}}).fetch();
  console.log(`Found ${liveTrades.length} existing trades. Monitoring each...`);
  liveTrades.forEach((tradeSettings) => {
    LogData(tradeSettings, `BootTime: Start monitoring existing trade ${tradeSettings._id} for ${tradeSettings.userName}.`);
    MonitorTradeToCloseItOut(tradeSettings);
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
    GetTradeSettingsFromSet,
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

// TestBackTestCode().then(r => {});

PerformSystemMaintenance();

// StartBackgroundPolling();
// ScheduleStartOfDayWork();
// ScheduleEndOfDayWork();
// CheckForAnyExistingTradesAndMonitorThem();
//

