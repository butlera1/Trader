import { Tracker } from 'meteor/tracker';

const TradeResults = new Mongo.Collection('tradeResults');

// Subscribe to the data for the current user.
Tracker.autorun(() => {
  Meteor.subscribe('tradeResults');
});

export default TradeResults;