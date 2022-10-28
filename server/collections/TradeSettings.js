import {Mongo} from 'meteor/mongo';
import {DefaultTradeSettings} from '../../imports/Interfaces/ITradeSettings';
import _ from 'lodash';

export const TradeSettings = new Mongo.Collection('tradeSettings');

function GetAllUserTradeSettings() {
  if (this.userId) {
    return TradeSettings.find({userId: this.userId}).fetch();
  }
  return 'Must have valid user for GetAllUserTradeSettings.';
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
  return null;
}

export {GetAllUserTradeSettings, SetUserTradeSettings, GetNewUserTradeSettingsRecord};