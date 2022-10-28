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
import {GetUserTradeSettings, SetUserTradeSettings} from './collections/tradeSettings';

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
  GetUserTradeSettings,
  BuyStock,
  SellStraddle,
  GetATMOptionChains,
  PerformTradeForAllUsers,
  Test,
});

function schedule() {
  const localTime = dayjs(GetNewYorkTimeAt(9, 25));
  const timeText = localTime.format('hh:mma');
  const scheduleText = `at ${timeText} every weekday`;
  console.log(`Schedule text: ${scheduleText}`);
  return later.parse.text(scheduleText);
}

SyncedCron.add({
  name: 'Every weekday, run trader for everyone.',
  schedule,
  job: PerformTradeForAllUsers,
});

SyncedCron.start();
