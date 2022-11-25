import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import LiveTrades from '../../Collections/LiveTrades';
import ITradeSettings, {IPrice} from '../../Interfaces/ITradeSettings';
import TradeResultsTable from './TradeResultsTable';
import ActiveTradesTable from './ActiveTradesTable';
import GraphActiveTrade from './GraphActiveTrade';

function MonitorLiveTrades() {

  const data: IPrice[] = [
      {
        "price": 2.315,
        whenNY: new Date("11/16/2022, 11:17:17 AM"),
        "gain": -0.004999999999999893
      },
      {
        "price": 2.34,
        whenNY: new Date("11/16/2022, 11:17:22 AM"),
        "gain": -0.029999999999999805
      },
      {
        "price": 2.34,
        whenNY: new Date("11/16/2022, 11:17:27 AM"),
        "gain": -0.029999999999999805
      },
      {
        "price": 2.34,
        whenNY: new Date("11/16/2022, 11:17:32 AM"),
        "gain": -0.029999999999999805
      },
      {
        "price": 2.335,
        whenNY: new Date("11/16/2022, 11:17:37 AM"),
        "gain": -0.02499999999999991
      },
      {
        "price": 2.345,
        whenNY: new Date("11/16/2022, 11:17:42 AM"),
        "gain": -0.03500000000000014
      },
      {
        "price": 2.35,
        whenNY: new Date("11/16/2022, 11:17:47 AM"),
        "gain": -0.040000000000000036
      },
      {
        "price": 2.34,
        whenNY: new Date("11/16/2022, 11:17:52 AM"),
        "gain": -0.029999999999999805
      },
      {
        "price": 2.3449999999999998,
        whenNY: new Date("11/16/2022, 11:17:57 AM"),
        "gain": -0.0349999999999997
      },
      {
        "price": 2.35,
        whenNY: new Date("11/16/2022, 11:18:03 AM"),
        "gain": -0.040000000000000036
      },
      {
        "price": 2.355,
        whenNY: new Date("11/16/2022, 11:18:07 AM"),
        "gain": -0.04499999999999993
      },
      {
        "price": 2.34,
        whenNY: new Date("11/16/2022, 11:18:13 AM"),
        "gain": -0.029999999999999805
      },
      {
        "price": 2.3299999999999996,
        whenNY: new Date("11/16/2022, 11:18:17 AM"),
        "gain": -0.019999999999999574
      },
      {
        "price": 2.34,
        whenNY: new Date("11/16/2022, 11:18:22 AM"),
        "gain": -0.029999999999999805
      },
      {
        "price": 2.34,
        whenNY: new Date("11/16/2022, 11:18:27 AM"),
        "gain": -0.029999999999999805
      },
      {
        "price": 2.335,
        whenNY: new Date("11/16/2022, 11:18:32 AM"),
        "gain": -0.02499999999999991
      },
      {
        "price": 2.355,
        whenNY: new Date("11/16/2022, 11:18:37 AM"),
        "gain": -0.04499999999999993
      },
      {
        "price": 2.355,
        whenNY: new Date("11/16/2022, 11:18:42 AM"),
        "gain": -0.04499999999999993
      },
      {
        "price": 2.34,
        whenNY: new Date("11/16/2022, 11:18:47 AM"),
        "gain": -0.029999999999999805
      },
      {
        "price": 2.335,
        whenNY: new Date("11/16/2022, 11:18:52 AM"),
        "gain": -0.02499999999999991
      },
      {
        "price": 2.335,
        whenNY: new Date("11/16/2022, 11:18:57 AM"),
        "gain": -0.02499999999999991
      },
      {
        "price": 2.3249999999999997,
        whenNY: new Date("11/16/2022, 11:19:03 AM"),
        "gain": -0.01499999999999968
      },
      {
        "price": 2.3249999999999997,
        whenNY: new Date("11/16/2022, 11:19:07 AM"),
        "gain": -0.01499999999999968
      },
      {
        "price": 2.315,
        whenNY: new Date("11/16/2022, 11:19:12 AM"),
        "gain": -0.004999999999999893
      },
      {
        "price": 2.31,
        whenNY: new Date("11/16/2022, 11:19:17 AM"),
        "gain": 0
      },
      {
        "price": 2.315,
        whenNY: new Date("11/16/2022, 11:19:22 AM"),
        "gain": -0.004999999999999893
      },
      {
        "price": 2.31,
        whenNY: new Date("11/16/2022, 11:19:27 AM"),
        "gain": 0
      },
      {
        "price": 2.315,
        whenNY: new Date("11/16/2022, 11:19:32 AM"),
        "gain": -0.004999999999999893
      },
      {
        "price": 2.3049999999999997,
        whenNY: new Date("11/16/2022, 11:19:37 AM"),
        "gain": 0.0050000000000003375
      },
      {
        "price": 2.295,
        whenNY: new Date("11/16/2022, 11:19:42 AM"),
        "gain": 0.015000000000000124
      },
      {
        "price": 2.295,
        whenNY: new Date("11/16/2022, 11:19:47 AM"),
        "gain": 0.015000000000000124
      },
      {
        "price": 2.2949999999999995,
        whenNY: new Date("11/16/2022, 11:19:52 AM"),
        "gain": 0.015000000000000568
      },
      {
        "price": 2.28,
        whenNY: new Date("11/16/2022, 11:19:57 AM"),
        "gain": 0.03000000000000025
      },
      {
        "price": 2.2849999999999997,
        whenNY: new Date("11/16/2022, 11:20:02 AM"),
        "gain": 0.025000000000000355
      },
      {
        "price": 2.2849999999999997,
        whenNY: new Date("11/16/2022, 11:20:07 AM"),
        "gain": 0.025000000000000355
      }
    ];

  return (
    <>
      <ActiveTradesTable/>
      {/*<GraphActiveTrade data={data}/>*/}
      <TradeResultsTable/>
    </>
  );
}

export default MonitorLiveTrades;