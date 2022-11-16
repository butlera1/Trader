import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import LiveTrades from '../../Collections/LiveTrades';
import ITradeSettings from '../../Interfaces/ITradeSettings';
import Chart from "react-apexcharts";
import TradeResultsTable from './TradeResultsTable';
import {Divider} from 'antd';
import ActiveTradesView from './ActiveTradesView';

function MonitorLiveTrades() {

  const liveTrades: ITradeSettings[] = useTracker(() => LiveTrades.find({}).fetch());
  const options = {
    chart: {
      id: "priceLine"
    },
    xaxis: {
      categories: [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998]
    }
  };

  const series = [
    {
      name: "series-1",
      data: [30, 40, 45, 50, 49, 60, 70, 91]
    }
  ];

  return (
    <>
      <ActiveTradesView/>
      <Divider />
      {/*<Chart*/}
      {/*  options={options}*/}
      {/*  series={series}*/}
      {/*  type="line"*/}
      {/*  width="500"*/}
      {/*  height="100"*/}
      {/*/>*/}
      <TradeResultsTable/>
    </>
  );
}

export default MonitorLiveTrades;