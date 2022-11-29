// @ts-ignore
import {Mongo} from 'meteor/mongo';
import ITradeSettings from "../../imports/Interfaces/ITradeSettings";
import SendOutInfo from "../SendOutInfo";
import {atob} from 'buffer';

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
  let finalMessage = `${message}, When NY: ${NYTimeText}`;
  let logType = LogType.Info;
  if (error) {
    finalMessage = `${finalMessage}\n${error.toString()}\nStack:\n${error.stack}`;
    logType = LogType.Error;
  }
  console.log(`LogData: ${finalMessage}`);
  Logs.insert({logType, tradeId: _id || 'System', message, when: when_NY});
  if (LogType.Error === logType) {
    const subject = `TRADER Failed to get current price.`;
    const text = `${finalMessage}\n\n--Trader System`;
    SendOutInfo(text, subject, emailAddress, phone);
    if (emailAddress !== adminEmail) {
      SendOutInfo(text, subject, adminEmail, adminPhone);
    }
  }
}

export {LogData, LogType};
