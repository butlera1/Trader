import React from 'react';
import {CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import TradeResults from '../../Collections/TradeResults';
import {Space} from 'antd';

interface ISumResults {
  description: string,
  whenClosed: string,
  gainLoss: number,
  sum: number,
}

function ChartResults() {
  let wins = 0;
  let losses = 0;
  let avgWin = 0;
  let avgLoss = 0;
  let maxWin = 0;
  let maxLoss = 0;

  const tradeResults: ISumResults[] = useTracker(() => {
    const records: ITradeResults[] = TradeResults.find().fetch();
    const sumResults: ISumResults[] = [];
    wins = 0.0;
    losses = 0.0;
    avgLoss = 0;
    avgWin = 0;
    maxWin = 0;
    maxLoss = 0;
    records.reduce((sum, record) => {
      sum = sum + record.gainLoss;
      const description = `${record.symbol}(${record.quantity ?? 1}) ${record.whenClosed} ${record.gainLoss.toFixed(2)}`;
      sumResults.push({
        description,
        whenClosed: record.whenClosed,
        sum,
        gainLoss: record.gainLoss,
      });
      if (record.gainLoss >= 0.0) {
        wins++;
        avgWin += record.gainLoss;
        if (record.gainLoss > maxWin) {
          maxWin = record.gainLoss.toFixed(2);
        }
      } else {
        losses++;
        avgLoss += record.gainLoss;
        if (record.gainLoss < maxLoss) {
          maxLoss = record.gainLoss.toFixed(2);
        }
      }
      return sum;
    }, 0.0);
    return sumResults;
  });
  avgLoss = (avgLoss/losses).toFixed(2);
  avgWin = (avgWin/wins).toFixed(2);
  const winRate = ((wins / tradeResults.length) * 100).toFixed(1);
  const lossRate = ((losses / tradeResults.length) * 100).toFixed(1);
  return (
    <Space>
      <LineChart width={600} height={300} data={tradeResults ?? []} margin={{top: 5, right: 20, bottom: 5, left: 0}}>
        <Line type="monotone" dataKey="sum" stroke="blue"/>
        <Line type="monotone" dataKey="gainLoss" stroke="pink"/>
        <CartesianGrid stroke="#ccc" strokeDasharray="5 5"/>
        <XAxis dataKey="description"/>
        <YAxis/>
        <Tooltip/>
      </LineChart>
      <div>
        <Space>
          <h2>WINS:</h2>
          <h3>{winRate}%</h3>
          <h3>Avg: ${avgWin}</h3>
          <h3>Max: ${maxWin}</h3>
        </Space>
        <Space>
          <h2>Losses:</h2>
          <h3>{lossRate}%</h3>
          <h3>Avg: ${avgLoss}</h3>
          <h3>Max: ${maxLoss}</h3>
        </Space>
        <Space>
          <h2>Totals:</h2>
          <h3>{tradeResults.length}, Wins: {wins}, Losses: {losses}</h3>
        </Space>
      </div>
    </Space>
  );
}

export default ChartResults;