import {TradeSettingsSets} from './collections/TradeSettingsSets';
import {TradeSettings} from './collections/TradeSettings.js';
import ITradeSettingsSet, {DefaultTradeSettingsSets} from '../imports/Interfaces/ITradeSettingsSet';
import {Users} from './collections/users';

function checkTradeSettingsSetExists(userId) {
  // Check if a user has a tradeSettingsSet
  // If not, create one using the existing tradeSettings for that user.
  // If so, do nothing.
  const sets :ITradeSettingsSet[] = TradeSettingsSets.find({userId}).fetch();
  if (sets.length === 0) {
    // Create a tradeSettingsSet for this user since he does not have any and make it the default one.
    const set: ITradeSettingsSet = {...DefaultTradeSettingsSets, userId, isDefault: true, name: 'Default'};
    set.tradeSettingIds = [];
    const tradeSettings = TradeSettings.find({userId}).forEach((tradeSettings) => {
      set.tradeSettingIds.push(tradeSettings._id);
    });
    TradeSettingsSets.insert(set);
    console.log('Added a default tradeSettingsSet for user: ' + Users.findOne({_id: userId}).username);
  } else {
    // We have sets so make sure one is set to isDefault
    const defaultSet = sets.find(set => set.isDefault);
    if (!defaultSet) {
      TradeSettingsSets.update(sets[0]._id, {$set: {isDefault: true}});
    }
  }
}


function PerformSystemMaintenance() {
  // If a user does not have a tradeSettingsSet, create one using the existing tradeSettings for that user.
  Users.find().fetch().forEach((user) => {
    checkTradeSettingsSetExists(user._id);
  });

}

export default PerformSystemMaintenance;