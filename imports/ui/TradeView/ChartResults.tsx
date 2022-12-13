import React from 'react';
import {CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import TradeResults from '../../Collections/TradeResults';
import ITradeSettings, {GetDescription} from '../../Interfaces/ITradeSettings';

interface ISumResults {
  description: string,
  whenClosed: string,
  gainLoss: number,
  sum: number,
}

function ChartResults() {
  const tradeResults: ISumResults[] = useTracker(() => {
    const records: ITradeResults[] = TradeResults.find().fetch();
    const sumResults: ISumResults[] = [];
    records.reduce((sum,record) => {
      sum = sum + record.gainLoss;
      const description = `${record.symbol}(${record.quantity ?? 1}) ${record.whenClosed} ${record.gainLoss.toFixed(2)}`;
      sumResults.push({
        description,
        whenClosed: record.whenClosed,
        sum,
        gainLoss: record.gainLoss,
      });
      return sum;
    }, 0.0);
    return sumResults;
  });
  return (<LineChart width={600} height={300} data={tradeResults ?? []} margin={{top: 5, right: 20, bottom: 5, left: 0}}>
      <Line type="monotone" dataKey="sum" stroke="blue"/>
      <Line type="monotone" dataKey="gainLoss" stroke="pink"/>
      <CartesianGrid stroke="#ccc" strokeDasharray="5 5"/>
      <XAxis dataKey="description"/>
      <YAxis/>
      <Tooltip/>
    </LineChart>
  );
}

export default ChartResults;