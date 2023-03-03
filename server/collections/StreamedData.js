// import {Mongo} from 'meteor/mongo';
// import {Meteor} from 'meteor/meteor';
// import Constants from '../../imports/Constants';
//
// export const StreamedData = new Mongo.Collection('streamedData');
//
// function publishStreamedData() {
//   return StreamedData.find();
// }
//
// Meteor.publish('streamedData', publishStreamedData);
//
//
// export function StreamDataUpsert(symbol, value) {
//   const item = {};
//   item[symbol] = value;
//   StreamedData.upsert(Constants.streamedDataId, {$addToSet: item});
// }
//
//
