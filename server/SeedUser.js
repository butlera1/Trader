import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';
import {Users} from './collections/users';

export const DefaultTradeSettings = {
  isTrading: false,
  desiredDelta: 0.25,
  percentGain: 0.26,
  percentLoss: 1.00,
  openHour: 9,
  openMinute: 45,
  closeHour: 11,
  closeMinute: 45,
  accountNumber: 'none',
  quantity: 1,
  symbol: 'SPY',
  emailAddress: 'none',
  phone: 'none'
};

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