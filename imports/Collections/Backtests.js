import {Tracker} from 'meteor/tracker';
import Constants from "../Constants";

const Backtests = new Mongo.Collection(Constants.backtestsCollectionName);

Tracker.autorun(() => {
    Meteor.subscribe(Constants.backtestPublishedName);
});

export default Backtests;