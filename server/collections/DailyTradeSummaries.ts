import {Mongo} from 'meteor/mongo';
import dayjs from "dayjs";
import ITradeSettings, {whyClosedEnum} from "../../imports/Interfaces/ITradeSettings.ts";
import {Random} from "meteor/random";
import IUserSettings from "../../imports/Interfaces/IUserSettings.ts";
import {UserSettings} from "./UserSettings.ts";
import {AnyPrerunningOn, SetEndOfDay, SetStartOfDay} from "../../imports/Utils.ts";

interface ITradeSummary {
  gainLoss: number,
  tradeId: string,
  description: string,
  whenOpened: Date,
  whenClosed: Date,
  whyClosed: whyClosedEnum,
}

function createTradeSummary(trade: ITradeSettings): ITradeSummary {
  return {
    gainLoss: trade.gainLoss - trade.totalFees,
    tradeId: trade._id,
    description: trade.description,
    whenOpened: trade.whenOpened,
    whenClosed: trade.whenClosed,
    whyClosed: trade.whyClosed,
  };
}

interface IDailyTradeSummary {
  _id?: string,
  dayDate: Date,
  userId: string,
  gainLoss: number,
  trades: ITradeSummary[],
  isDailyLossLimitReached?: boolean,
  isDailyGainLimitReached?: boolean,
}

function getDefaultIDailyTradeSummary(userId:string, date: Date): IDailyTradeSummary {
  return {
    gainLoss: 0,
    dayDate: date,
    trades: [],
    userId,
    isDailyGainLimitReached: false,
    isDailyLossLimitReached: false,
  };
}

const DailyTradeSummaries: Mongo.Collection<IDailyTradeSummary> = new Mongo.Collection('dailyTradeSummaries');
// Define indexes for the collection to aid with searching the data.
DailyTradeSummaries.createIndex({userId: 1});
DailyTradeSummaries.createIndex({dayDate: 1});
DailyTradeSummaries.createIndex({userId: 1, dayDate: 1});

function GetDailyTradeSummaryFor(tradeSettings: ITradeSettings, date: Date): IDailyTradeSummary {
  const {userId, accountNumber} = tradeSettings;
  const startOfDate = SetStartOfDay(dayjs(date)).toDate();
  const endOfDate = SetEndOfDay(dayjs(date)).toDate();
  const query = {
    userId,
    dayDate: {$gte:startOfDate,$lt:endOfDate},
  };
  const summary: IDailyTradeSummary = DailyTradeSummaries.findOne(query) ||
    getDefaultIDailyTradeSummary(userId, date);
  summary._id = summary._id || Random.id();
  return summary;
}

function PrepareDailyTradeSummariesFor(tradeSettings: ITradeSettings, date: Date) {
  const record: IDailyTradeSummary = GetDailyTradeSummaryFor(tradeSettings, date);
  const id = record._id;
  delete record._id;
  record.gainLoss = 0;
  record.trades = [];
  record.isDailyGainLimitReached = false;
  record.isDailyLossLimitReached = false;
  DailyTradeSummaries.upsert(id, record);
}

function SaveTradeToDailySummaryAndIsEmergencyClose(tradeSettings: ITradeSettings, date: Date): boolean {
  const {userId, isBacktesting} = tradeSettings;
  const summary: IDailyTradeSummary = GetDailyTradeSummaryFor(tradeSettings, date);

  const id = summary._id;
  delete summary._id;
  if (!AnyPrerunningOn(tradeSettings)) {
    // Don't record any pre-running trades.
    summary.gainLoss += tradeSettings.gainLoss;
  }
  let isEmergencyCloseAllTrades = false;
  summary.trades.push(createTradeSummary(tradeSettings));
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
  const {userId} = tradeSettings;
  const summary: IDailyTradeSummary = DailyTradeSummaries.findOne({userId, dayDate: date}) ||
    getDefaultIDailyTradeSummary(userId, date);
  return summary.isDailyGainLimitReached || summary.isDailyLossLimitReached
}

function GetDailyTradeSummariesForUserAndDayRange(from: Date, to: Date): IDailyTradeSummary[] {
  const userId = Meteor.userId();
  if (!userId) throw new Meteor.Error('not-authorized');
  const startOfDate = SetStartOfDay(dayjs(from)).toDate();
  const endOfDate = SetEndOfDay(dayjs(to)).toDate();
  const query = {
    userId,
    dayDate: {$gte:startOfDate,$lt:endOfDate},
  };
  return DailyTradeSummaries.find(query).fetch();
}

export {
  DailyTradeSummaries,
  ITradeSummary,
  IDailyTradeSummary,
  SaveTradeToDailySummaryAndIsEmergencyClose,
  GetDailyTradeSummaryFor,
  PrepareDailyTradeSummariesFor,
  IsDailyGainOrLossLimitReached,
  GetDailyTradeSummariesForUserAndDayRange,
};
