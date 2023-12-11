import {Mongo} from 'meteor/mongo';

interface IDailyTradeSummary {
  _id?: string,
  userId: string,
  accountNumber: string,
  dateText: string,
  gainLoss: number,
  tradeIds: string[],
}

const DailyTradeSummaries: Mongo.Collection<IDailyTradeSummary> = new Mongo.Collection('dailyTradeSummaries');


export {DailyTradeSummaries, IDailyTradeSummary};
