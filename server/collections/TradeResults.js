import {Mongo} from 'meteor/mongo';
import {Meteor} from 'meteor/meteor';

export const TradeResults = new Mongo.Collection('tradeResults');

function publishTradeResults() {
  const query = {userId: this.userId};
  return TradeResults.find(query, {limit: 100});
}

Meteor.publish('tradeResults', publishTradeResults);