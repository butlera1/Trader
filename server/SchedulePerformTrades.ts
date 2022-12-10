import dayjs from 'dayjs';
import {LogData} from './collections/Logs';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
import {GetNewYorkTimeAt, PerformTradeForAllUsers} from './Trader';
import {AppSettings} from './collections/AppSettings';
import Constants from '../imports/Constants';

function SchedulePerformTrades() {
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
    let timerHandle = Meteor.setTimeout(() => {
      try {
        if (timerHandle) {
          Meteor.clearTimeout(timerHandle);
          timerHandle = null;
        }
        PerformTradeForAllUsers()
          .catch((reason) => {
            LogData(null, `Failed calling PerformTradeForAllUsers. Reason: ${reason}`, reason);
          });
        SchedulePerformTrades();
      } catch (ex) {
        LogData(null, `Failed inside timeOut loop for 'Perform Trades For All Users' and 'SchedulePerformTrades'.`, ex);
      }
    }, delayInMilliseconds);
  } catch (ex) {
    LogData(null, `Failed to schedule 'Perform Trades For All Users'.`, ex);
  }
}

export default SchedulePerformTrades;