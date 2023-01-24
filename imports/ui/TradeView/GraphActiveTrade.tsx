import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import {CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
import {IPrice} from '../../Interfaces/ITradeSettings';

function GraphActiveTrade({monitoredPrices}: { monitoredPrices: IPrice[] }) {
  return (
    <LineChart
      width={300}
      height={200}
      data={monitoredPrices}
    >
      <CartesianGrid strokeDasharray="3 3"/>
      <YAxis/>
      <XAxis dataKey="whenNY"/>
      <Tooltip/>
      <Legend/>
      <Line type="monotone" dataKey="gain" stroke="green" dot={false} isAnimationActive={false}/>
    </LineChart>
  );
}


export default GraphActiveTrade;