// @ts-ignore
import {Mongo} from 'meteor/mongo';
import ITradeSettings from "../../imports/Interfaces/ITradeSettings";
import SendOutInfo from "../SendOutInfo";
import {GetNewYorkTimeAt} from "../Trader";

export const Logs = new Mongo.Collection('logs');

enum LogType {
    Info = 'Info',
    Error = 'Error',
}

function LogData(tradeSettings: ITradeSettings, message: string, error: Error | null = null) {
    const currentLocalTime = new Date();
    const NYTimeText = currentLocalTime.toLocaleString('en-US', {timeZone: 'America/New_York'});
    const when_NY = new Date(NYTimeText);
    let finalMessage = `${message}\nWhen NY: ${NYTimeText}`;
    let logType = LogType.Info;
    if (error) {
        finalMessage = `${finalMessage}\n${error.toString()}\nStack:\n${error.stack}`;
        logType = LogType.Error;
    }
    console.log(`LogData: ${finalMessage}`);
    Logs.insert({logType, tradeId: tradeSettings._id, message, when: when_NY});
    if (LogType.Error === logType) {
        const subject = `TRADER Failed to get current price.`;
        const text = `${finalMessage}\n\n--Trader System`;
        SendOutInfo(text, subject, tradeSettings.emailAddress, tradeSettings.phone);
    }
}

export {LogData, LogType};
