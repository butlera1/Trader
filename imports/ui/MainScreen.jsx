import React from 'react';
import UserSettings from './UserSettings';
import TradeResultsView from './TradeView/TradeResultsView';
import Tools from './Tools/Tools';
import ActiveTradesTable from './TradeView/ActiveTradesTable';
import TradeSettingsSetsEditor from "./TradeSettingsSets/TradeSettingsSetsEditor";
import HeaderLine from './HeaderLine';

export const MainScreen = () => {
  return (<>
      <UserSettings/>
      <Tools/>
      <ActiveTradesTable/>
      <TradeSettingsSetsEditor/>
      <TradeResultsView/>
    </>
  );
};
