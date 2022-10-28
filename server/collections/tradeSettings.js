import { Mongo } from 'meteor/mongo';

export const TradeSettings = new Mongo.Collection('tradeSettings');

async function GetUserTradeSettings(){
  let result = {};
  if (this.userId){
    result = TradeSettings.findOne(this.userId, {fields: {_id: 0}});
    result = record.tradeSettings;
  }
  return result;
}

async function SetUserTradeSettings(tradeSettings){
  if (this.userId){
    if (tradeSettings._id) {
      delete tradeSettings._id;
    }
    TradeSettings.update(this.userId, {$set: {...tradeSettings}});
  }
}

export {GetUserTradeSettings, SetUserTradeSettings}