import {Mongo} from 'meteor/mongo';
import {Meteor} from 'meteor/meteor';
import {AppSettings} from './AppSettings';
import Constants from '../../imports/Constants';
import {SetEndOfDay, SetStartOfDay} from '../../imports/Utils';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import weekday from 'dayjs/plugin/weekday';
import locale from 'dayjs/plugin/localeData';

dayjs.extend(customParseFormat);
dayjs.extend(weekday);
dayjs.extend(locale);

export const Trades = new Mongo.Collection('trades');

/******************* Publish liveTrades **********************************/
function publishLiveTrades() {
  const query = {userId: this.userId, whyClosed: {$exists: false}};
  return Trades.find(query);
}

Meteor.publish('liveTrades', publishLiveTrades);


/********************* Publish tradeResults **********************************/
function publishTradeResults() {
  // Default to today's date (minus 1 day since server is running in GMT time) only so we don't ship too much data to the client at start up time.
  const query = {
    userId: this.userId,
    whyClosed: {$exists: true},
    whenOpened: {$gte: SetStartOfDay(dayjs().subtract(1, 'day')).toDate()},
    whenClosed: {$lte: SetEndOfDay(dayjs()).toDate()},
  };
  const settings = AppSettings.findOne(Constants.appSettingsId);
  return Trades.find(query, {limit: settings?.maxPublishedTrades ?? 50, sort: {whenOpened: -1}});
}

Meteor.publish('tradeResults', publishTradeResults);