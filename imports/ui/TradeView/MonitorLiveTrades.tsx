import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import TradeResultsTable from './TradeResultsTable';
import ChartResults from './ChartResults';

function MonitorLiveTrades() {
  return (
    <>
      <ChartResults/>
      <TradeResultsTable/>
    </>
  );
}

export default MonitorLiveTrades;