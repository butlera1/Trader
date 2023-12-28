import {Mongo} from 'meteor/mongo';
import {DefaultTradeSettings} from '../../imports/Interfaces/ITradeSettings';
import _ from 'lodash';
import {QueueUsersTradesForTheDay} from '../Trader';
import {LogData} from './Logs';
import {TradeSettingsSets} from './TradeSettingsSets';

export const TradeSettings = new Mongo.Collection('tradeSettings');

function DeleteUserTradeSettingsRecord(recordId) {
  if (Meteor.userId()) {
    TradeSettings.remove(recordId);
    // Remove this ID from any TradeSettingsSets.tradeSettingIds arrays.
    TradeSettingsSets.update({}, {$pull: {tradeSettingsIds: recordId}});
    return true;
  }
  throw new Meteor.Error('Must have valid user for DeleteUserTradeSettings.');
}

function GetTradeSettingsFromSet(set) {
  if (!set?.tradeSettingIds?.length) {
    return [];
  }
  const query = {
    $or: set.tradeSettingIds.map(_id => ({_id}))
  };
  return TradeSettings.find(query).fetch();
}

function GetTradeSettingsFromSetMethod(set) {
  if (Meteor.userId()) {
    return GetTradeSettingsFromSet(set);
  }
  throw new Meteor.Error('Must have valid user for GetTradeSettingsFromSet.');
}

function GetUserTradeSettings(tradeSettingId) {
  if (Meteor.userId()) {
    return TradeSettings.findOne({_id: tradeSettingId});
  }
  throw new Meteor.Error('Must have valid user for GetUserTradeSettings.');
}

function GetTradeSettingNames() {
  if (Meteor.userId()) {
    return TradeSettings.find({userId: Meteor.userId()}, {fields: {name: 1, _id: 1}}).fetch();
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
  GetTradeSettingsFromSet,
  GetTradeSettingsFromSetMethod,
  SetUserTradeSettings,
  GetNewUserTradeSettingsRecord,
  GetUserTradeSettings,
  DeleteUserTradeSettingsRecord,
  GetTradeSettingNames,
};