import React, {useState} from 'react';
import {TradeSettingsEditor} from './TradeSettings/TradeSettingsEditor';
import {DefaultTradeSettings} from '../Interfaces/ITradeSettings';

export const MainScreen = () => {
  const [tradeSettings, setTradeSettings] = useState(DefaultTradeSettings);

  return (
      <TradeSettingsEditor tradeSettings={tradeSettings}/>
  );
};
