import {Tracker} from 'meteor/tracker';
import Constants from "../Constants";

const Ranges = new Mongo.Collection(Constants.rangesCollectionName);

Tracker.autorun(() => {
  Meteor.subscribe(Constants.rangesPublishedName);
});

export default Ranges;