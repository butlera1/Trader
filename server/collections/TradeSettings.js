import {Mongo} from 'meteor/mongo';
import {DefaultTradeSettings} from '../../imports/Interfaces/ITradeSettings';
import _ from 'lodash';

export const TradeSettings = new Mongo.Collection('tradeSettings');

function DeleteUserTradeSettingsRecord(recordId) {
  if (Meteor.userId()) {
    return TradeSettings.remove(recordId);
  }
  throw new Meteor.Error('Must have valid user for DeleteUserTradeSettings.');
}

function GetAllUserTradeSettings() {
  if (Meteor.userId()) {
    return TradeSettings.find({userId: this.userId}).fetch();
  }
  throw new Meteor.Error('Must have valid user for GetAllUserTradeSettings.');
}

function GetUserTradeSettings(tradeSettingId) {
  if (Meteor.userId()) {
    return TradeSettings.findOne({_id: tradeSettingId});
  }
  throw new Meteor.Error('Must have valid user for GetUserTradeSettings.');
}

function GetNewUserTradeSettingsRecord() {
  if (!Meteor.userId()) {
    throw new Meteor.Error('Must have valid user for this GetNewUserTradeSettingsRecord.');
  }
  const data = _.cloneDeep(DefaultTradeSettings);
  data.userId = this.userId;
  data._id = TradeSettings.insert(data);
  return data;
}

const SetUserTradeSettings = (tradeSettings) => {
  if (!Meteor.userId()) {
    throw new Meteor.Error('Must have valid user for SetUserTradeSettings.');
  }
  if (!(tradeSettings?._id)) {
    throw new Meteor.Error('Error: called SetUserTradeSettings without an _id in the record.');
  }
  const _id = tradeSettings?._id;
  if (tradeSettings._id) {
    delete tradeSettings._id;
  }
  TradeSettings.update(_id, {$set: {...tradeSettings}});
  return true;
};

export {
  GetAllUserTradeSettings,
  SetUserTradeSettings,
  GetNewUserTradeSettingsRecord,
  GetUserTradeSettings,
  DeleteUserTradeSettingsRecord
};