import {Mongo} from 'meteor/mongo';
import dayjs from "dayjs";
import ITradeSettings from "../../imports/Interfaces/ITradeSettings.ts";
import {Random} from "meteor/random";
import IUserSettings from "../../imports/Interfaces/IUserSettings.ts";
import {UserSettings} from "./UserSettings.ts";

interface IDailyTradeSummary {
  _id?: string,
  userId: string,
  accountNumber: string,
  dateText: string,
  gainLoss: number,
  tradeIds: string[],
}

const DailyTradeSummaries: Mongo.Collection<IDailyTradeSummary> = new Mongo.Collection('dailyTradeSummaries');

function createDateText(date: Date) {
  return dayjs(date).format('YYYY-MM-DD');
}

function GetDailyTradeSummariesFor(tradeSettings: ITradeSettings, date: Date): IDailyTradeSummary {
  const dateText = createDateText(date);
  const {userId, accountNumber} = tradeSettings;
  const summary: IDailyTradeSummary = DailyTradeSummaries.findOne({userId, accountNumber, dateText}) || {
    gainLoss: 0,
    tradeIds: [],
    userId,
    accountNumber,
    dateText
  };
  return summary;
}

function ClearDailyTradeSummariesFor(tradeSettings: ITradeSettings, date: Date) {
  const dateText = createDateText(date);
  const {userId, accountNumber} = tradeSettings;
  DailyTradeSummaries.upsert({userId, accountNumber, dateText}, {$set: {gainLoss: 0, tradeIds: []}});
}

function SaveTradeToDailySummaryAndIsEmergencyClose(tradeSettings: ITradeSettings, date: Date) :boolean {
  const dateText = createDateText(date);
  const {userId, accountNumber} = tradeSettings;
  const summary: IDailyTradeSummary = DailyTradeSummaries.findOne({userId, accountNumber, dateText}) || {
    gainLoss: 0,
    tradeIds: [],
    userId,
    accountNumber,
    dateText
  };
  const id = summary._id || Random.id();
  delete summary._id;
  if (!tradeSettings.isPrerunningVIXSlope && !tradeSettings.isPrerunning) {
    // Don't record any pre-running trades.
    summary.gainLoss += tradeSettings.gainLoss;
  }
  let isEmergencyCloseAllTrades = false;
  summary.tradeIds.push(tradeSettings._id);
  const userSettings: IUserSettings = UserSettings.findOne({_id: userId});
  if (summary.gainLoss < -Math.abs(userSettings.maxAllowedDailyLoss)) {
    // User has lost too much money today.  Disable their account.
    UserSettings.update({_id: userId}, {$set: {accountIsActive: false}});
    isEmergencyCloseAllTrades = true;
  }
  if (summary.gainLoss > Math.abs(userSettings.maxAllowedDailyGain)) {
    // User has gained enough money today.  Disable their account.
    UserSettings.update({_id: userId}, {$set: {isMaxGainAllowedMet: true}});
    isEmergencyCloseAllTrades = true;
  }
  DailyTradeSummaries.upsert(id, summary);
  return isEmergencyCloseAllTrades;
}

export {DailyTradeSummaries, IDailyTradeSummary};
