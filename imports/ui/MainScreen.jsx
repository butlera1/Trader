import React, {useEffect, useState} from 'react';
import TabTradeSettings from './TradeSettings/TabTradeSettings';
import UserSettings from './UserSettings';
import {Meteor} from 'meteor/meteor';
import {Space} from 'antd';
import MonitorLiveTrades from './TradeView/MonitorLiveTrades';

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
    <Space>
      <TabTradeSettings/>
      <MonitorLiveTrades/>
    </Space>
  </>);
};
