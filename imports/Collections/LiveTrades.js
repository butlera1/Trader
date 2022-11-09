import { Tracker } from 'meteor/tracker';

const LiveTrades = new Mongo.Collection('trades');

// Subscribe to the count for the current room.
Tracker.autorun(() => {
  Meteor.subscribe('liveTrades');
});

export default LiveTrades;