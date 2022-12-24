import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';
import {UserSettings} from './collections/UserSettings';
import {atob} from 'buffer';

const pwArch = atob('TG92ZTJhbGwh');
const pwJames = atob('VG9hZDI1MA==');

function prepareAccounts(name, other) {
  let userRecord = Accounts.findUserByUsername(name);
  if (!userRecord) {
    Accounts.createUser({
      username: name,
      password: other,
    });
  }
  userRecord = Accounts.findUserByUsername(name);
  const usersSettingsRecord = UserSettings.findOne(userRecord._id);
  if (!usersSettingsRecord) {
    const defaultUserSettings = {
      _id: userRecord._id,
      accountNumber: 'None',
      email: 'None',
      phone: 'None',
    };
    UserSettings.insert(defaultUserSettings);
  }
}

Meteor.startup(() => {
  prepareAccounts('Arch', pwArch);
  prepareAccounts('James', pwJames);
});