import {Tracker} from 'meteor/tracker';
import {Mongo} from "meteor/mongo";

const TradeSettingsSets = new Mongo.Collection('tradeSettingsSets');

Tracker.autorun(() => {
  Meteor.subscribe('usersTradeSettingsSets');
});


export default TradeSettingsSets;