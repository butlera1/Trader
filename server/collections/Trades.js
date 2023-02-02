import {Mongo} from 'meteor/mongo';
import {Meteor} from 'meteor/meteor';

export const Trades = new Mongo.Collection('trades');

/******************* Publish liveTrades **********************************/
function publishLiveTrades() {
  const query = {userId: this.userId, whyClosed: {$exists: false}};
  return Trades.find(query);
}

Meteor.publish('liveTrades', publishLiveTrades);

/********************* Publish tradeResults **********************************/
function publishTradeResults() {
  const query = {userId: this.userId, whyClosed: {$exists: true}};
  return Trades.find(query, {limit: 50, sort: {_id: 1}});
}

Meteor.publish('tradeResults', publishTradeResults);