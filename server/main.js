import later from 'later';
import {SyncedCron} from 'meteor/littledata:synced-cron';
import {Meteor} from 'meteor/meteor';
import './collections/stockData';
import './collections/straddleData';
import {
  DeleteUserTradeSettingsRecord,
  GetAllUserTradeSettings,
  GetNewUserTradeSettingsRecord,
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
import {
  EmergencyCloseAllTrades,
  ExecuteTrade,
  GetNewYorkTimeAt,
  MonitorTradeToCloseItOut,
  PerformTradeForAllUsers
} from './Trader';
import {WebApp} from 'meteor/webapp';
import {Trades} from './collections/Trades';
import {LogData} from './collections/Logs';
import SendOutInfo from './SendOutInfo';

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
  ExecuteTrade(tradeSettings, forceTheTrade).then();
}

function CheckForAnyExistingTradesAndMonitorThem() {
  // Find all live trades for this user.
  const liveTrades = Trades.find({whyClosed: {$exists: false}}).fetch();
  const text = `Trader rebooting: Found ${liveTrades.length} existing trades to start monitoring.`;
  SendOutInfo(text, text); // Send to admin
  liveTrades.forEach(async (tradeSettings) => {
    LogData(tradeSettings, `BootTime: Start monitoring existing trade ${tradeSettings._id}.`);
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
  GetAllUserTradeSettings,
  GetNewUserTradeSettingsRecord,
  DeleteUserTradeSettingsRecord,
  BuyStock,
  SellStraddle,
  GetATMOptionChains,
  PerformTradeForAllUsers,
  TestStrategy,
  EmergencyCloseAllTrades,
});

function schedule() {
  const localTime = GetNewYorkTimeAt(9, 26);
  const timeText = localTime.format('hh:mma');
  const scheduleText = `at ${timeText} every weekday`;
  console.log(`Schedule text: ${scheduleText}`);
  return later.parse.text(scheduleText);
}

SyncedCron.add({
  name: 'Every weekday, run trader for everyone.',
  schedule,
  job: () => {
    console.log(`Mocked out PerformTradesForAllUsers: Not doing anything right now.`);
  },
});

SyncedCron.start();

CheckForAnyExistingTradesAndMonitorThem();

