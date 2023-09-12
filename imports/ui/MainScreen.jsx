import React, {useEffect, useState} from 'react';
import TabTradeSettings from './TradeSettings/TabTradeSettings';
import UserSettings from './UserSettings';
import {Meteor} from 'meteor/meteor';
import TradeResultsView from './TradeView/TradeResultsView';
import Tools from './Tools';
import ActiveTradesTable from './TradeView/ActiveTradesTable';
import SPXSlopeAngleView from './SlopeAngleView/SPXSlopeAngleView';

export const MainScreen = () => {
  const [userSettings, setUserSettings] = useState(null);
  useEffect(() => {
    Meteor.call('GetUserSettings', (error, userSettingsRecord) => {
      if (error) {
        alert(`Failed to get user settings. Error: ${error}`);
        return;
      }
      setUserSettings(userSettingsRecord);
    });
  }, []);


  return (<>
      <UserSettings userSettings={userSettings}/>
      <Tools/>
      <SPXSlopeAngleView/>
      <ActiveTradesTable/>
      <TabTradeSettings/>
      <TradeResultsView/>
    </>
  );
};
