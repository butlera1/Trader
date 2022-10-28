import {Meteor} from 'meteor/meteor';

function ConfirmValidatedUser(){
  if (!this.userId) {
    throw new Meteor.Error('ConfirmValidatedUser: Must be called with a logged in user.');
  }
  
  return true;
}

export default ConfirmValidatedUser;