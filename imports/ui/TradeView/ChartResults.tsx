import React from 'react';
import {CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import {Space} from 'antd';
import ITradeSettings from '../../Interfaces/ITradeSettings';
import dayjs from 'dayjs';
import {CalculateTotalFees} from '../../Utils';

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
    if (!record.isPrerunning) {
      const description = getDescription(record);
      const actualGainLoss = record.gainLoss - CalculateTotalFees(record);
      sum = sum + actualGainLoss;
      sumResults.push({
        description,
        whenClosed: record.whenClosed,
        sum,
        gainLoss: actualGainLoss,
      });
      if (actualGainLoss >= 0.0) {
        wins++;
        avgWinTmp += actualGainLoss;
        if (actualGainLoss > maxWin) {
          maxWin = actualGainLoss;
        }
      } else {
        losses++;
        avgLossTmp += actualGainLoss;
        if (actualGainLoss < maxLoss) {
          maxLoss = actualGainLoss;
        }
      }
      avgDuration += getTradeDurationMinutes(record);
    }
    return sum;
  }, 0.0);
  const avgLossText = losses ? ((avgLossTmp / losses).toFixed(2)) : '0.00';
  const avgWinText = wins ? ((avgWinTmp / wins).toFixed(2)) : '0.00';
  const winRate = sumResults.length ? (((wins / sumResults.length) * 100).toFixed(1)) : '0.0';
  const lossRate = sumResults.length ? (((losses / sumResults.length) * 100).toFixed(1)) : '0.0';
  avgDuration = records.length ? avgDuration / records.length : 0;

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