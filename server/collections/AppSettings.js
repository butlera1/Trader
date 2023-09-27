import {Mongo} from 'meteor/mongo';
import Constants from '../../imports/Constants';
import _ from 'lodash';

export const AppSettings = new Mongo.Collection('appSettings');

function GetAppSettings() {
  try {
    if (!Meteor.userId()) {
      return new Meteor.Error('Must have valid user in GetAppSettings.');
    }
    return AppSettings.findOne(Constants.appSettingsId);
  } catch (e) {
    return new Meteor.Error(e.message);
  }
}

function SetAppSettings(appSettings) {
  try {
    if (!_.isObject(appSettings)) {
      return new Meteor.Error('Must provide appSettings parameter to SetAppSettings.');
    }
    if (!Meteor.userId()) {
      return new Meteor.Error('Must have valid user in SetAppSettings.');
    }
    delete appSettings._id;
    AppSettings.upsert(Constants.appSettingsId, appSettings);
    return 'Ok. Done.';
  } catch (e) {
    return new Meteor.Error(e.message);
  }
}

export {GetAppSettings, SetAppSettings};