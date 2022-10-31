import React, {useState} from 'react';
import {TradeSettingsEditor} from './TradeSettings/TradeSettingsEditor';
import {DefaultTradeSettings} from '../Interfaces/ITradeSettings';
import TabTradeSettings from './TradeSettings/TabTradeSettings';

export const MainScreen = () => {
  const [tradeSettings, setTradeSettings] = useState(DefaultTradeSettings);

  return (
    <>
      <TabTradeSettings/>
    </>
  );
};
