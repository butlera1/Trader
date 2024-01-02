import {Mongo} from 'meteor/mongo';
import {Meteor} from 'meteor/meteor';
import Constants from "../../imports/Constants";

export const Ranges = new Mongo.Collection(Constants.rangesCollectionName);

// Define indexes for the collection to aid with searching the data.
Ranges.createIndex({userId: 1});

/********************* Publish **********************************/

async function publishRangesRecords() {
  const userId = this.userId;
  return Ranges.find({userId});
}

Meteor.publish(Constants.rangesPublishedName, publishRangesRecords);
