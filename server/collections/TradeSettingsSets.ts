import {Mongo} from 'meteor/mongo';
import {Meteor} from "meteor/meteor";
import ITradeSettingsSet from "../../imports/Interfaces/ITradeSettingsSet";

export const TradeSettingsSets :Mongo.Collection<ITradeSettingsSet> = new Mongo.Collection('tradeSettingsSets');

function publishUsersTradeSettingsSets() {
  return TradeSettingsSets.find({userId: this.userId});
}

Meteor.publish('usersTradeSettingsSets', publishUsersTradeSettingsSets);
