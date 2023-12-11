import {Tracker} from 'meteor/tracker';
import {Mongo} from 'meteor/mongo';
import ITradeSettingsSet from '../Interfaces/ITradeSettingsSet';

const TradeSettingsSets: Mongo.Collection<ITradeSettingsSet> = new Mongo.Collection('tradeSettingsSets');

Tracker.autorun(() => {
  Meteor.subscribe('usersTradeSettingsSets');
});


export default TradeSettingsSets;