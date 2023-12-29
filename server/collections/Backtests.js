import {Mongo} from 'meteor/mongo';
import {Meteor} from 'meteor/meteor';
import Constants from "../../imports/Constants";

export const Backtests = new Mongo.Collection(Constants.backtestsCollectionName);

// Define indexes for the collection to aid with searching the data.
Backtests.createIndex({userId: 1});

/********************* Publish **********************************/

async function publishBacktestRecords() {
  const userId = this.userId;
  return Backtests.find({_id: userId});
}

Meteor.publish(Constants.backtestPublishedName, publishBacktestRecords);

function GetBacktestTradesFromIds(tradeSettingIds) {
  if (Meteor.userId()) {
    const query = {
      $or: tradeSettingIds.map(_id => ({_id}))
    };
    return Backtests.find(query).fetch();
  }
  throw new Meteor.Error('Must have valid user for GetBacktestTradesFromIds.');
}

export {GetBacktestTradesFromIds};