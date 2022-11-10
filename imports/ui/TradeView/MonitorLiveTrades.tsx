import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import LiveTrades from '../../Collections/LiveTrades';
import ITradeSettings from '../../Interfaces/ITradeSettings';
import Chart from "react-apexcharts";

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
      <h1>{`Current live trades (${liveTrades.length}).`}</h1>
      <ul>
        {liveTrades.map((trade, index) => {
          let price = 'None';
          let gain = 0;
          if (trade?.monitoredPrices?.length > 0) {
            const item = trade.monitoredPrices[trade.monitoredPrices?.length - 1];
            price = item.price.toFixed(2);
            gain = item.gain;
          }
          return <li
            key={index}>{`(${trade._id}) Entry: ${trade.openingPrice.toFixed(2)}, Current Price: ${price}, Gain: ${gain.toFixed(2)}`}</li>;
        })
        }
      </ul>
      <Chart
        options={options}
        series={series}
        type="line"
        width="500"
        height="100"
      />    </>
  );
}

export default MonitorLiveTrades;