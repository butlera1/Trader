import {Mongo} from 'meteor/mongo';
import {Meteor} from 'meteor/meteor';

export const Trades = new Mongo.Collection('trades');

function publishLiveTrades() {
  const query = {userId: this.userId, whyClosed: {$exists: false}};
  return Trades.find(query,
    {
      fields: {
        _id: 1,
        monitoredPrices: 1,
        gainLimit: 1,
        lossLimit: 1,
        openingPrice: 1,
        whenOpened: 1,
        quantity: 1,
        symbol: 1,
        isMocked: 1,
      }
    });
}

Meteor.publish('liveTrades', publishLiveTrades);