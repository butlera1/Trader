import later from 'later';
import { SyncedCron } from 'meteor/littledata:synced-cron';
import { Meteor } from 'meteor/meteor';
import './collections/stockData';
import './collections/straddleData';
import {
  DeleteUserTradeSettingsRecord,
  GetAllUserTradeSettings, GetNewUserTradeSettingsRecord, GetUserTradeSettings, SetUserTradeSettings
} from './collections/TradeSettings';
import { Users } from './collections/users';
import './collections/UserSettings';
import { GetUserSettings, SaveUserSettings } from './collections/UserSettings';
import ConfirmValidatedUser from './Methods/ConfirmValidatedUser';
import './SeedUser';
import {
  BuyStock,
  GetAccessToken,
  GetATMOptionChains,
  GetOrders, SellStraddle,
  SetUserAccessInfo
} from './TDAApi/TDAApi';
import { GetNewYorkTimeAt, PerformTradeForAllUsers, PerformTradeForUser } from './Trader';

// Listen to incoming HTTP requests (can only be used on the server).
WebApp.connectHandlers.use('/traderOAuthCallback', (req, res, next) => {
  res.writeHead(200);
  res.end(`Trader received a redirect callback. Received new access code: \n${decodeURI(req.query?.code)}`);
});

function Test() {
  const user = Users.findOne({ username: 'Arch' });
  const settings = user.services.tradeSettings;
  settings.isTrading = true;
  SetUserTradeSettings(settings);
  PerformTradeForUser(user).then();
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
  ConfirmValidatedUser,
  BuyStock,
  SellStraddle,
  GetATMOptionChains,
  PerformTradeForAllUsers,
  Test,
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
  job: () => { },
});

SyncedCron.start();
