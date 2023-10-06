import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';
import {UserSettings} from './collections/UserSettings';
import {atob} from 'buffer';
import {DefaultUserSettings} from '../imports/Interfaces/IUserSettings';

const pwArch = atob('TG92ZTJhbGwh');
const pwJames = atob('VG9hZDI1MA==');

/**
 * Prepare the accounts for users. The _id used in the UserSettings collection is the same as the _id in the
 * Meteor.users collection.
 * @param name
 * @param other
 */
function prepareAccounts(name, other) {
  let userRecord = Accounts.findUserByUsername(name);
  if (!userRecord) {
    Accounts.createUser({
      username: name,
      password: other,
    });
  }
  userRecord = Accounts.findUserByUsername(name);
  const settings = {
    ...DefaultUserSettings,
    ...UserSettings.findOne(userRecord._id),
  };
  delete settings._id;
  UserSettings.upsert(userRecord._id, settings);
}

Meteor.startup(() => {
  prepareAccounts('Arch', pwArch);
  prepareAccounts('James', pwJames);
});