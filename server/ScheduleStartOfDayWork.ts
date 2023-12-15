import dayjs from 'dayjs';
import {LogData} from './collections/Logs';
import {Meteor} from 'meteor/meteor';
import {PerformTradeForAllUsers} from './Trader';
import {GetNewYorkTimeAt, SetEndOfDay, SetStartOfDay,} from '../imports/Utils';
import {AppSettings} from './collections/AppSettings';
import Constants from '../imports/Constants';
import {StartBackgroundPolling} from "./BackgroundPolling";
import {ResetUsersMaxDailyGainSettings} from './collections/UserSettings';
import {Trades} from './collections/Trades';

function ScheduleStartOfDayWork() {
  try {
    const settings = AppSettings.findOne(Constants.appSettingsId);
    let desiredTradeTime = GetNewYorkTimeAt(settings.startHourNY, settings.startMinuteNY);
    const now = dayjs();
    if (desiredTradeTime.isBefore(now)) {
      // If it is already passed that time today, add a day and calculate next wakeup time.
      desiredTradeTime = desiredTradeTime.add(1, 'days');
    }
    let delayInMilliseconds = dayjs.duration(desiredTradeTime.diff(now)).asMilliseconds();
    const localTimeCheck = desiredTradeTime.format('MMM DD YYYY hh:mm a');
    const NYTimeCheck = desiredTradeTime.toDate().toLocaleString('en-US', {timeZone: 'America/New_York'});
    LogData(null, `Scheduling: 'Perform Trades For All Users' for ${localTimeCheck} local time or ${NYTimeCheck} NY time.`);
    const timerHandle = Meteor.setTimeout(async () => {
      try {
        Meteor.clearTimeout(timerHandle);
        Trades.remove({
          whyClosed: {$exists: true},
          whenClosed: {$lte: SetStartOfDay(dayjs()).toDate()},
        }); // Clear out any completed trades, leaving live trades from today.
        StartBackgroundPolling();
        ResetUsersMaxDailyGainSettings();
        PerformTradeForAllUsers();
        ScheduleStartOfDayWork(); // For tomorrow.
      } catch (ex) {
        LogData(null, `Failed inside timeOut loop for 'Perform Trades For All Users' and 'SchedulePerformTrades'.`, ex);
      }
    }, delayInMilliseconds);
  } catch (ex) {
    LogData(null, `Failed to schedule 'Perform Trades For All Users'.`, ex);
  }
}

export default ScheduleStartOfDayWork;