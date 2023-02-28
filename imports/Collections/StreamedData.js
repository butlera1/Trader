import {Tracker} from 'meteor/tracker';

const StreamedData = new Mongo.Collection('streamedData');

Tracker.autorun(() => {
  Meteor.subscribe('streamedData');
});


export {StreamedData};