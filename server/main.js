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
import ConfirmValidatedUser from './Methods/ConfirmValidatedUser';
import './SeedUser';
import {
    BuyStock,
    GetAccessToken,
    GetATMOptionChains,
    GetOrders,
    SellStraddle,
    SetUserAccessInfo
} from './TDAApi/TDAApi';
import {ExecuteTrade, GetNewYorkTimeAt, PerformTradeForAllUsers} from './Trader';
import {WebApp} from 'meteor/webapp';

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
    TestStrategy,
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
    },
});

SyncedCron.start();
