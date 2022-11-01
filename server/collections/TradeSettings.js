import {Mongo} from 'meteor/mongo';
import {DefaultTradeSettings} from '../../imports/Interfaces/ITradeSettings';
import _ from 'lodash';

export const TradeSettings = new Mongo.Collection('tradeSettings');

function DeleteUserTradeSettingsRecord(recordId) {
  if (this.userId) {
    return TradeSettings.remove(recordId);
  }
  return 'Must have valid user for DeleteUserTradeSettings.';
}

function GetAllUserTradeSettings() {
  if (this.userId) {
    return TradeSettings.find({userId: this.userId}).fetch();
  }
  return 'Must have valid user for GetAllUserTradeSettings.';
}

function GetUserTradeSettings(tradeSettingId) {
  if (this.userId) {
    return TradeSettings.findOne({_id: tradeSettingId});
  }
  return 'Must have valid user for GetUserTradeSettings.';
}

function GetNewUserTradeSettingsRecord() {
  if (!this.userId) {
    return 'Must have valid user for this GetNewUserTradeSettingsRecord.';
  }
  const data = _.cloneDeep(DefaultTradeSettings);
  data.userId = this.userId;
  data._id = TradeSettings.insert(data);
  return data;
}

function SetUserTradeSettings(tradeSettings) {
  if (!this.userId) {
    return 'Must have valid user for SetUserTradeSettings.';
  }
  if (!(tradeSettings?._id)) {
    return 'Error: called SetUserTradeSettings without an _id in the record.';
  }
  const _id = tradeSettings?._id;
  if (tradeSettings._id) {
    delete tradeSettings._id;
  }
  TradeSettings.update(_id, {$set: {...tradeSettings}});
  return true;
}

export {
  GetAllUserTradeSettings,
  SetUserTradeSettings,
  GetNewUserTradeSettingsRecord,
  GetUserTradeSettings,
  DeleteUserTradeSettingsRecord
};