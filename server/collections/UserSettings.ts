// @ts-ignore
import {Mongo} from 'meteor/mongo';

export const UserSettings = new Mongo.Collection('userSettings');

function GetUserSettings() {
  if (!this.userId) {
    return 'Must have valid user for this GetUserSettings.';
  }
  return UserSettings.findOne({_id: this.userId});
}

function SaveUserSettings(userSettings) {
  if (!this.userId) {
    return 'Must have valid user for SaveUserSettings.';
  }
  if (!(userSettings?._id)) {
    return 'Error: called SetUserTradeSettings without an _id in the record.';
  }
  const _id = userSettings?._id;
  if (userSettings._id) {
    delete userSettings._id;
  }
  UserSettings.update(_id, {$set: {...userSettings}});
  return null;
}

export {
  GetUserSettings,
  SaveUserSettings,
};