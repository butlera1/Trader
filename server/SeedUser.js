import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';

function prepareAccounts(name, other){
  if (!Accounts.findUserByUsername(name)) {
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