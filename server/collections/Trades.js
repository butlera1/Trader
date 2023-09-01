import {Mongo} from 'meteor/mongo';
import {Meteor} from 'meteor/meteor';
import {AppSettings} from './AppSettings';
import Constants from '../../imports/Constants';

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
  const settings = AppSettings.findOne(Constants.appSettingsId);
  return Trades.find(query, {limit: settings?.maxPublishedTrades ?? 50, sort: {whenOpened: -1}});
}

Meteor.publish('tradeResults', publishTradeResults);