import {TradeSettingsSets} from './collections/TradeSettingsSets';
import {TradeSettings} from './collections/TradeSettings.js';
import ITradeSettingsSets, {DefaultTradeSettingsSets} from '../imports/Interfaces/ITradeSettingsSets';
import {Users} from './collections/users';

function checkTradeSettingsSetExists(userId) {
  // Check if a user has a tradeSettingsSet
  // If not, create one using the existing tradeSettings for that user.
  // If so, do nothing.
  const sets = TradeSettingsSets.find({userId}).fetch();
  if (sets.length === 0) {
    // Create a tradeSettingsSet for this user since he does not have any and make it the default one..
    const set: ITradeSettingsSets = {...DefaultTradeSettingsSets, userId, isDefault: true, name: 'Default'};
    set.tradeSettings = [];
    const tradeSettings = TradeSettings.find({userId}).forEach((tradeSettings) => {
      set.tradeSettings.push(tradeSettings._id);
    });
    TradeSettingsSets.insert(set);
  }
}


function PerformSystemMaintenance() {
  // If a user does not have a tradeSettingsSet, create one using the existing tradeSettings for that user.
  Users.find().fetch().forEach((user) => {
    checkTradeSettingsSetExists(user._id);
  });

}

export default PerformSystemMaintenance;