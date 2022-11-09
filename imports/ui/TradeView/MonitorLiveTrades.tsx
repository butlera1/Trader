import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import LiveTrades from '../../Collections/LiveTrades';
import ITradeSettings from '../../Interfaces/ITradeSettings';


function MonitorLiveTrades() {

  const liveTrades: ITradeSettings[] = useTracker(() => LiveTrades.find({}).fetch());

  return (
    <>
      <h1>Current live trades.</h1>
      <ul>
        {liveTrades.map(trade => <li>{`(${trade._id}) Current Price: ${trade.monitoredPrices[trade.monitoredPrices.length-1].price.toFixed(2)}`}</li>)}
      </ul>
    </>
  );
}

export default MonitorLiveTrades;