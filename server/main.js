import {Meteor} from 'meteor/meteor';
import './collections/stockData';
import './collections/straddleData';
import {
  DeleteUserTradeSettingsRecord,
  GetAllUserTradeSettings,
  GetNewUserTradeSettingsRecord,
  GetTradeSettingNames,
  GetUserTradeSettings,
  SetUserTradeSettings,
  TradeSettings
} from './collections/TradeSettings';
import './collections/UserSettings';
import {GetUserSettings, SaveUserSettings} from './collections/UserSettings';
import './SeedUser';
import {
  BuyStock,
  GetAccessToken,
  GetATMOptionChains,
  GetOrders,
  SellStraddle,
  SetUserAccessInfo
} from './TDAApi/TDAApi';
import {EmergencyCloseAllTrades, ExecuteTrade, MonitorTradeToCloseItOut} from './Trader';
import {WebApp} from 'meteor/webapp';
import {Trades} from './collections/Trades';
import {LogData} from './collections/Logs';
import ScheduleStartOfDayWork from './ScheduleStartOfDayWork';
import {AppSettings} from './collections/AppSettings';
import Constants from '../imports/Constants';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import './TDAApi/StreamEquities';
import ScheduleEndOfDayWork from './ScheduleEndOfDayWork';

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
  ExecuteTrade(tradeSettings, forceTheTrade, tradeSettings.isPrerun, tradeSettings.isPrerunSlope).then();
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
    GetAllUserTradeSettings,
    GetNewUserTradeSettingsRecord,
    DeleteUserTradeSettingsRecord,
    BuyStock,
    SellStraddle,
    GetATMOptionChains,
    TestStrategy,
    EmergencyCloseAllTrades,
  }
);

console.log(`Current local time is ${new Date()}.`);

// Define the AppSettings record if not there already. Let DB record valus override defaults.
const settings = {
  startHourNY: 9,
  startMinuteNY: 25,
  endOfDayHourNY: 16,
  endOfDayMinuteNY: 15,
  maxPublishedTrades: 50,
  ...AppSettings.findOne(Constants.appSettingsId),
};
delete settings._id;
AppSettings.upsert(Constants.appSettingsId, settings);

ScheduleStartOfDayWork();
ScheduleEndOfDayWork();
CheckForAnyExistingTradesAndMonitorThem();


// PrepareStreaming()
//   .then(() => {
//     console.log(`Streaming is ready so checking on existing trades to monitor.`);
//     CheckForAnyExistingTradesAndMonitorThem();
//   })
//   .catch((err) => {
//     console.error(`Error preparing streaming: ${err}`);
//   });

