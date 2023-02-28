import {Tracker} from 'meteor/tracker';

const Trades = new Mongo.Collection('trades');

Tracker.autorun(() => {
  Meteor.subscribe('liveTrades');
});

Tracker.autorun(() => {
  Meteor.subscribe('tradeResults');
});

export default Trades;