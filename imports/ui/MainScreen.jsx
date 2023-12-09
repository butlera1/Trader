import React from 'react';
import TabTradeSettings from './TradeSettings/TabTradeSettings';
import UserSettings from './UserSettings';
import TradeResultsView from './TradeView/TradeResultsView';
import Tools from './Tools/Tools';
import ActiveTradesTable from './TradeView/ActiveTradesTable';
import TradeSettingsSetsEditor from "./TradeSettingsSets/TradeSettingsSetsEditor";

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
