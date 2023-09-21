// @ts-ignore
import { Mongo } from 'meteor/mongo';

const DailyTradeSummaries = new Mongo.Collection('dailyTradeSummaries');

interface IDailyTradeSummary {
  _id: string,
  userId: string,
  accountNumber: string,
  dateText: string,
  gainLoss: number,
  tradeIds: string[],
}

export { DailyTradeSummaries, IDailyTradeSummary};
