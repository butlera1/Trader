import dayjs from 'dayjs';
import {LogData} from './collections/Logs';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
import {GetNewYorkTimeAt} from './Trader';
import {AppSettings} from './collections/AppSettings';
import Constants from '../imports/Constants';
import {EraseAllStreamedData, StopDataStreaming} from './TDAApi/StreamEquities';

function ScheduleEndOfDayWork() {
  try {
    const settings = AppSettings.findOne(Constants.appSettingsId);
    let desiredTradeTime = GetNewYorkTimeAt(settings.endOfDayHourNY, settings.endOfDayMinuteNY);
    const now = dayjs();
    if (desiredTradeTime.isBefore(now)) {
      // If it is already passed that time today, add a day and calculate next wakeup time.
      desiredTradeTime = desiredTradeTime.add(1, 'days');
    }
    let delayInMilliseconds = dayjs.duration(desiredTradeTime.diff(now)).asMilliseconds();
    const timerHandle = Meteor.setTimeout(() => {
      try {
        Meteor.clearTimeout(timerHandle);
        StopDataStreaming();
        EraseAllStreamedData();
        ScheduleEndOfDayWork();
      } catch (ex) {
        LogData(null, `Failed inside timeOut loop for 'EndOfDayWord' and 'ScheduleEndOfDayWork'.`, ex);
      }
    }, delayInMilliseconds);
  } catch (ex) {
    LogData(null, `Failed to schedule 'EndOfDayWord'.`, ex);
  }
}

export default ScheduleEndOfDayWork;