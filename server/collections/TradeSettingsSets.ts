import {Mongo} from 'meteor/mongo';
import {Meteor} from "meteor/meteor";
import ITradeSettingsSet from "../../imports/Interfaces/ITradeSettingsSet";
import {TradeSettings} from "./TradeSettings.js";
import {GetDescription} from "../../imports/Interfaces/ITradeSettings.ts";

export const TradeSettingsSets: Mongo.Collection<ITradeSettingsSet> = new Mongo.Collection('tradeSettingsSets');

function publishUsersTradeSettingsSets() {
  return TradeSettingsSets.find({userId: this.userId});
}

Meteor.publish('usersTradeSettingsSets', publishUsersTradeSettingsSets);


function GetTradeSettingsInfoFromSetId(id: string) {
  try {
    const result = [];
    if (!Meteor.userId()) {
      return new Meteor.Error('Must have valid user in GetTradeSettingsInfoFromSetId.');
    }
    const set = TradeSettingsSets.findOne(id);
    if (!set) {
      return result;
    }
    for (const tsId of set.tradeSettingIds) {
      const ts = TradeSettings.findOne(tsId);
      if (ts) {
        result.push(GetDescription(ts));
      }
    }
    return result;
  } catch (e) {
    return new Meteor.Error(e.message);
  }
}

export {GetTradeSettingsInfoFromSetId};