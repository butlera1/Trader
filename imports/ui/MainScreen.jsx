import React, {useState, useEffect} from 'react';
import TabTradeSettings from './TradeSettings/TabTradeSettings';
import UserSettings from './UserSettings';
import {Meteor} from 'meteor/meteor';

export const MainScreen = () => {
  const [userSettings, setUserSettings] = useState(null);
  useEffect(() => {
    Meteor.call('GetUserSettings', (error, userSettingsRecord) => {
      if (error) {
        setErrorText(`Failed to get user settings. Error: ${error}`);
        return;
      }
      setUserSettings(userSettingsRecord);
    });
  }, []);


  return (<>
    <UserSettings userSettings={userSettings}/>
    <TabTradeSettings/>
  </>);
};
