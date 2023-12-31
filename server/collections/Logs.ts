import {Mongo} from 'meteor/mongo';
import ITradeSettings from "../../imports/Interfaces/ITradeSettings";
import {SendTextToAdmin} from "../SendOutInfo";
import {atob} from 'buffer';
import Constants from '../../imports/Constants';

export const Logs = new Mongo.Collection('logs');

const adminEmail = atob('c3BvY2thYkBnbWFpbC5jb20=');
const adminPhone = atob('KzE5NTIzOTM4NzE5');

enum LogType {
  Info = 'Info',
  Error = 'Error',
}

function LogData(tradeSettings: ITradeSettings | null, message: string, error: Error | null = null) {
  const currentLocalTime = new Date();
  const {_id, emailAddress, phone} = tradeSettings || {
    _id: 'System',
    emailAddress: adminEmail,
    phone: adminPhone
  };
  const NYTimeText = currentLocalTime.toLocaleString('en-US', {timeZone: 'America/New_York'});
  const when_NY = new Date(NYTimeText);
  let finalMessage = `"${message}", When NY: ${NYTimeText} (Vr. ${Constants.version})`;
  let logType = LogType.Info;
  if (error) {
    finalMessage = `${finalMessage}\n${error.toString()}\nStack:\n${error.stack}`;
    logType = LogType.Error;
  }
  Logs.insert({logType, tradeId: _id || 'System', message, when: when_NY});
  if (LogType.Error === logType) {
    console.error(`LogData: ${finalMessage}`;
    console.error(error);
    const subject = `TRADER EXCEPTION.`;
    const text = `${finalMessage.substring(0, 1500)}\n\n--Trader System`;
    SendTextToAdmin(text, subject);
  } else {
    console.info(`LogData: ${finalMessage}`);
  }
}

export {LogData, LogType};
