import {Mongo} from 'meteor/mongo';
import dayjs from "dayjs";
import ITradeSettings from "../../imports/Interfaces/ITradeSettings.ts";
import {Random} from "meteor/random";
import IUserSettings from "../../imports/Interfaces/IUserSettings.ts";
import {UserSettings} from "./UserSettings.ts";
import {AnyPrerunningOn} from "../../imports/Utils.ts";

interface IDailyTradeSummary {
  _id?: string,
  userId: string,
  accountNumber: string,
  dateText: string,
  gainLoss: number,
  tradeIds: string[],
  isDailyLossLimitReached?: boolean,
  isDailyGainLimitReached?: boolean,
}

function getDefaultIDailyTradeSummary(accountNumber, userId, dateText): IDailyTradeSummary {
  return {
    gainLoss: 0,
    tradeIds: [],
    userId,
    accountNumber,
    dateText,
    isDailyGainLimitReached: false,
    isDailyLossLimitReached: false,
  };
}

const DailyTradeSummaries: Mongo.Collection<IDailyTradeSummary> = new Mongo.Collection('dailyTradeSummaries');

function createDateText(date: Date) {
  return dayjs(date).format('YYYY-MM-DD');
}

function GetDailyTradeSummariesFor(tradeSettings: ITradeSettings, date: Date): IDailyTradeSummary {
  const dateText = createDateText(date);
  const {userId, accountNumber} = tradeSettings;
  const summary: IDailyTradeSummary = DailyTradeSummaries.findOne({userId, accountNumber, dateText}) ||
    getDefaultIDailyTradeSummary(accountNumber, userId, dateText);
  summary._id = summary._id || Random.id();
  return summary;
}

function PrepareDailyTradeSummariesFor(tradeSettings: ITradeSettings, date: Date) {
  const record: IDailyTradeSummary = GetDailyTradeSummariesFor(tradeSettings, date);
  const id = record._id;
  delete record._id;
  record.gainLoss = 0;
  record.tradeIds = [];
  record.isDailyGainLimitReached = false;
  record.isDailyLossLimitReached = false;
  DailyTradeSummaries.upsert(id, record);
}

function SaveTradeToDailySummaryAndIsEmergencyClose(tradeSettings: ITradeSettings, date: Date): boolean {
  const {userId, isBacktesting} = tradeSettings;
  const summary: IDailyTradeSummary = GetDailyTradeSummariesFor(tradeSettings, date);

  const id = summary._id;
  delete summary._id;
  if (!AnyPrerunningOn(tradeSettings)) {
    // Don't record any pre-running trades.
    summary.gainLoss += tradeSettings.gainLoss;
  }
  let isEmergencyCloseAllTrades = false;
  summary.tradeIds.push(tradeSettings._id);
  const userSettings: IUserSettings = UserSettings.findOne({_id: userId});
  if (summary.gainLoss < -Math.abs(userSettings.maxAllowedDailyLoss)) {
    summary.isDailyLossLimitReached = true;
    if (!isBacktesting) {
      // User has lost too much money today.  Disable user's account.
      UserSettings.update({_id: userId}, {$set: {accountIsActive: false}});
    }
    isEmergencyCloseAllTrades = true;
  }
  if (summary.gainLoss > Math.abs(userSettings.maxAllowedDailyGain)) {
    summary.isDailyGainLimitReached = true;
    if (!isBacktesting) {
      // User has gained enough money today.
      UserSettings.update({_id: userId}, {$set: {isMaxGainAllowedMet: true}});
    }
    isEmergencyCloseAllTrades = true;
  }
  DailyTradeSummaries.upsert(id, summary);
  return isEmergencyCloseAllTrades;
}

function IsDailyGainOrLossLimitReached(tradeSettings: ITradeSettings, date: Date) {
  const dateText = createDateText(date);
  const {userId, accountNumber} = tradeSettings;
  const summary: IDailyTradeSummary = DailyTradeSummaries.findOne({userId, accountNumber, dateText}) ||
    getDefaultIDailyTradeSummary(accountNumber, userId, dateText);

  return summary.isDailyGainLimitReached || summary.isDailyLossLimitReached
}

export {
  DailyTradeSummaries,
  IDailyTradeSummary,
  SaveTradeToDailySummaryAndIsEmergencyClose,
  GetDailyTradeSummariesFor,
  PrepareDailyTradeSummariesFor,
  IsDailyGainOrLossLimitReached,
};
