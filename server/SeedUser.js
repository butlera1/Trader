import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';
import {Users} from './collections/users';
import {DefaultTradeSettings} from '../imports/Interfaces/ITradeSettings';

function prepareAccounts(name, other) {
  let userRecord = Accounts.findUserByUsername(name);
  if (!userRecord) {
    Accounts.createUser({
      username: name,
      password: other,
    });
  }
  // Add/update trader settings values to the user.
  userRecord = Accounts.findUserByUsername(name);
  const tradeSettings = {...DefaultTradeSettings, ...(userRecord?.services.tradeSettings)};
  Users.update(userRecord._id, {$set: {'services.tradeSettings': tradeSettings}});
}

Meteor.startup(() => {
  prepareAccounts('Arch', 'Love2all!');
  prepareAccounts('James', 'Toad250');
});