import {Mongo} from 'meteor/mongo';
import {Meteor} from 'meteor/meteor';

export const BacktestTrades = new Mongo.Collection('backtestTrades');

/********************* Publish tradeResults **********************************/
function publishBacktestTradeResults() {
    const query = {
        userId: this.userId,
    };
    return BacktestTrades.find(query, {sort: {whenOpened: -1}});
}

Meteor.publish('backtestTrades', publishBacktestTradeResults);