import React from 'react';
import {CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import {Space} from 'antd';
import ITradeSettings from '../../Interfaces/ITradeSettings';
import dayjs from 'dayjs';

interface ISumResults {
  description: string,
  whenClosed: Date,
  gainLoss: number,
  sum: number,
}

function getDescription(record) {
  return record.description ?? `${record.symbol}(${record.quantity ?? 1})`;
}

function getDateTime(record) {
  return dayjs(record.whenClosed).format('MM/DD h:mm:ss');
}

function getTradeDurationMinutes(trade: ITradeSettings) {
  let initialTime = dayjs(trade.whenOpened);
  return dayjs(trade.whenClosed).diff(initialTime, 'minute', true);
}

function ChartResults({records}: { records: ITradeSettings[] }) {

  const sumResults: ISumResults[] = [];
  let wins = 0.0;
  let losses = 0.0;
  let avgLossTmp = 0;
  let avgWinTmp = 0;
  let maxWin = 0;
  let maxLoss = 0;
  let avgDuration = 0;

  records.reduce((sum, record) => {
    const description = getDescription(record);
    sum = sum + record.gainLoss;
    sumResults.push({
      description,
      whenClosed: record.whenClosed,
      sum,
      gainLoss: record.gainLoss,
    });
    if (record.gainLoss >= 0.0) {
      wins++;
      avgWinTmp += record.gainLoss;
      if (record.gainLoss > maxWin) {
        maxWin = record.gainLoss;
      }
    } else {
      losses++;
      avgLossTmp += record.gainLoss;
      if (record.gainLoss < maxLoss) {
        maxLoss = record.gainLoss;
      }
    }
    avgDuration += getTradeDurationMinutes(record);
    return sum;
  }, 0.0);
  const avgLossText = ((avgLossTmp / losses).toFixed(2));
  const avgWinText = ((avgWinTmp / wins).toFixed(2));
  const winRate = (((wins / sumResults.length) * 100).toFixed(1));
  const lossRate = (((losses / sumResults.length) * 100).toFixed(1));
  avgDuration = avgDuration / records.length;

  return (
    <Space>
      <LineChart width={400} height={200} data={sumResults ?? []} margin={{top: 5, right: 20, bottom: 5, left: 0}}>
        <Line type="monotone" dataKey="sum" stroke="blue" dot={false}/>
        <Line type="monotone" dataKey="gainLoss" stroke="pink" dot={false}/>
        <CartesianGrid stroke="#ccc" strokeDasharray="5 5"/>
        <XAxis dataKey={getDateTime}/>
        <YAxis/>
        <Tooltip/>
      </LineChart>
      <div>
        <Space>
          <h2>WINS:</h2>
          <h3>{winRate}%</h3>
          <h3>Avg: ${avgWinText}</h3>
          <h3>Max: ${maxWin.toFixed(2)}</h3>
        </Space>
        <br/>
        <Space>
          <h2>Losses:</h2>
          <h3>{lossRate}%</h3>
          <h3>Avg: ${avgLossText}</h3>
          <h3>Max: ${maxLoss.toFixed(2)}</h3>
        </Space>
        <br/>
        <Space>
          <h2>Average Duration:</h2>
          <h3>{avgDuration.toFixed(1)} min</h3>
        </Space>
        <br/>
        <Space>
          <h2>Totals:</h2>
          <h3>{sumResults.length}, Wins: {wins}, Losses: {losses}</h3>
        </Space>
      </div>
    </Space>
  );
}

export default ChartResults;