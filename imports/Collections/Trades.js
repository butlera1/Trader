import {Tracker} from 'meteor/tracker';

const Trades = new Mongo.Collection('trades');

// Subscribe to the count for the current room.
Tracker.autorun(() => {
  Meteor.subscribe('liveTrades');
});

// Subscribe to the count for the current room.
Tracker.autorun(() => {
  Meteor.subscribe('tradeResults');
});

export default Trades;