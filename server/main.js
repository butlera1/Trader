import {Meteor} from 'meteor/meteor';
import { SyncedCron } from 'meteor/littledata:synced-cron';
import './collections/straddleData';
import './collections/stockData';
import {
  BuyStock,
  GetAccessToken,
  GetATMOptionChains,
  GetOrders, IsOptionMarketOpenToday,
  PlaceModeledTrade,
  SellStraddle,
  SetUserAccessInfo
} from './TDAApi/TDAApi';
import './SeedUser';
import later from 'later';
import {GetNewYorkTimeAt, PerformTradeForAllUsers, PerformTradeForUser} from './Trader';
import dayjs from 'dayjs';
import {Users} from './collections/users';
import {
  GetAllUserTradeSettings,
  GetNewUserTradeSettingsRecord,
  SetUserTradeSettings
} from './collections/TradeSettings';
import ConfirmValidatedUser from './Methods/ConfirmValidatedUser';

// Listen to incoming HTTP requests (can only be used on the server).
WebApp.connectHandlers.use('/traderOAuthCallback', (req, res, next) => {
  res.writeHead(200);
  res.end(`Trader received a redirect callback. Received new access code: \n${decodeURI(req.query?.code)}`);
});

function Test(){
  const user = Users.findOne({username: 'Arch'});
  const settings = user.services.tradeSettings;
  settings.isTrading = true;
  SetUserTradeSettings(settings);
  PerformTradeForUser(user).then();
}

Meteor.methods({
  SetUserAccessInfo,
  GetAccessToken,
  GetOrders,
  SetUserTradeSettings,
  GetAllUserTradeSettings,
  GetNewUserTradeSettingsRecord,
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
  job: ()=>{},
});

SyncedCron.start();
