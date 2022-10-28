import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';
import {Users} from './collections/users';
import {DefaultTradeSettings} from '../imports/Interfaces/ITradeSettings';
import {TradeSettings} from './collections/TradeSettings';

function prepareAccounts(name, other) {
  let userRecord = Accounts.findUserByUsername(name);
  if (!userRecord) {
    Accounts.createUser({
      username: name,
      password: other,
    });
  }
}

Meteor.startup(() => {
  prepareAccounts('Arch', 'Love2all!');
  prepareAccounts('James', 'Toad250');
});