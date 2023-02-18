import {Mongo} from 'meteor/mongo';
import {DefaultTradeSettings} from '../../imports/Interfaces/ITradeSettings';
import _ from 'lodash';
import {QueueUsersTradesForTheDay} from '../Trader';
import {LogData} from './Logs';

export const TradeSettings = new Mongo.Collection('tradeSettings');

function DeleteUserTradeSettingsRecord(recordId) {
  if (Meteor.userId()) {
    return TradeSettings.remove(recordId);
  }
  throw new Meteor.Error('Must have valid user for DeleteUserTradeSettings.');
}

function GetAllUserTradeSettings() {
  if (Meteor.userId()) {
    return TradeSettings.find({userId: Meteor.userId()}).fetch();
  }
  throw new Meteor.Error('Must have valid user for GetAllUserTradeSettings.');
}

function GetUserTradeSettings(tradeSettingId) {
  if (Meteor.userId()) {
    return TradeSettings.findOne({_id: tradeSettingId});
  }
  throw new Meteor.Error('Must have valid user for GetUserTradeSettings.');
}

function GetTradeSettingNames() {
  if (Meteor.userId()) {
    return TradeSettings.find({userId: Meteor.userId()}, {fields: {name: 1}}).fetch().map(record => record.name);
  }
  throw new Meteor.Error('Must have valid user for GetTradeSettingNames.');
}

function GetNewUserTradeSettingsRecord() {
  if (!Meteor.userId()) {
    throw new Meteor.Error('Must have valid user for this GetNewUserTradeSettingsRecord.');
  }
  const data = _.cloneDeep(DefaultTradeSettings);
  data.userId = Meteor.userId();
  data.userName = Meteor.user().username;
  data._id = TradeSettings.insert(data);
  return data;
}

const SetUserTradeSettings = (tradeSettings) => {
  try {
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
    // Changing any tradeSettings resets any scheduled trades by calling the following....
    QueueUsersTradesForTheDay(Meteor.user())
      .catch(reason => {
        LogData(tradeSettings, `Failed in SetUserTradeSettings calling QueueUsersTradesForTheDay: ${reason}`);
      });
    return true;
  } catch (ex) {
    LogData(tradeSettings, `Failed in SetUserTradeSettings`, ex);
    return false;
  }
};

export {
  GetAllUserTradeSettings,
  SetUserTradeSettings,
  GetNewUserTradeSettingsRecord,
  GetUserTradeSettings,
  DeleteUserTradeSettingsRecord,
  GetTradeSettingNames,
};