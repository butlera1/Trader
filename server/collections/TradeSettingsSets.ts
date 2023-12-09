// @ts-ignore
import {Mongo} from 'meteor/mongo';
// @ts-ignore
import {Meteor} from "meteor/meteor";

export const TradeSettingsSets = new Mongo.Collection('tradeSettingsSets');

function publishUsersTradeSettingsSets() {
  return TradeSettingsSets.find({userId: this.userId});
}

Meteor.publish('usersTradeSettingsSets', publishUsersTradeSettingsSets);
