import {Mongo} from 'meteor/mongo';
import {Meteor} from 'meteor/meteor';

export const BacktestTrades = new Mongo.Collection('backtestTrades');

/********************* Publish tradeResults **********************************/

async function publishBacktestRecordsCount() {
    const query = {
        userId: this.userId,
    };
    const count = await BacktestTrades.countDocuments(query);
    return [{backtestRecordCountForUser: this.userId, count}];
}
Meteor.publish('BacktestRecordsCount', publishBacktestRecordsCount);