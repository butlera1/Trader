import React from 'react';
import {CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import {Space} from 'antd';
import ITradeSettings from '../../Interfaces/ITradeSettings';
import dayjs from 'dayjs';
import {CalculateTotalFees, CleanupGainLossWhenFailedClosingTrade, GetNewYorkTimeAsText} from '../../Utils';

interface ISumResults {
  description: string,
  whenClosed: Date,
  gainLoss: number,
  sum: number,
}

function getDescription(record) {
  return record.description ?? `${record.symbol}`;
}

function getDateTime(record) {
  return GetNewYorkTimeAsText(record.whenClosed);
}

function getTradeDurationMinutes(trade: ITradeSettings) {
  let initialTime = dayjs(trade.whenOpened);
  return dayjs(trade.whenClosed).diff(initialTime, 'minute', true);
}

interface ITotalsProps {
  numberOfTrades: number,
  winnings: number,
  losses: number,
  totalGains: number,
}

function Totals({numberOfTrades, winnings, losses, totalGains}: ITotalsProps) {
  const color = totalGains >= 0 ? 'green' : 'red';
  const ColoredStuff = <span>Result: ${totalGains.toFixed(2)}</span>;
  return <h2 style={{color}}>{numberOfTrades} trades, Wins: ${winnings.toFixed(2)} - Losses:
    ${Math.abs(losses).toFixed(2)} = {ColoredStuff}</h2>;
}

function ChartResults({records, isGraphPrerunningTrades}: {
  records: ITradeSettings[],
  isGraphPrerunningTrades: boolean
}) {
  const sumResults: ISumResults[] = [];
  let wins = 0.0;
  let losses = 0.0;
  let avgLossTmp = 0;
  let avgWinTmp = 0;
  let maxWin = 0;
  let maxLoss = 0;
  let avgDuration = 0;
  let avgWinDuration = 0;
  let avgLossDuration = 0;
  let sumWins = 0;
  let sumLosses = 0;

  const resultSum = records.reduce((sum, record) => {
    const isAnyPrerunning = record.isPrerunning || record.isPrerunningVWAPSlope || record.isPrerunningVIXSlope || record.isPrerunningGainLimit;
    if (!isAnyPrerunning || isGraphPrerunningTrades) {
      const description = getDescription(record);
      CleanupGainLossWhenFailedClosingTrade(record);
      const actualGainLoss = record.gainLoss - CalculateTotalFees(record);
      sum = sum + actualGainLoss;
      sumResults.push({
        description,
        whenClosed: record.whenClosed,
        sum,
        gainLoss: actualGainLoss,
      });
      const currentTradeDuration = getTradeDurationMinutes(record);
      avgDuration += currentTradeDuration;
      if (actualGainLoss >= 0.0) {
        wins++;
        sumWins += actualGainLoss;
        avgWinTmp += actualGainLoss;
        avgWinDuration += currentTradeDuration;
        if (actualGainLoss > maxWin) {
          maxWin = actualGainLoss;
        }
      } else {
        losses++;
        sumLosses += actualGainLoss;
        avgLossTmp += actualGainLoss;
        avgLossDuration += currentTradeDuration;
        if (actualGainLoss < maxLoss) {
          maxLoss = actualGainLoss;
        }
      }
    }
    return sum;
  }, 0.0);
  const avgLossText = losses ? ((avgLossTmp / losses).toFixed(2)) : '0.00';
  const avgWinText = wins ? ((avgWinTmp / wins).toFixed(2)) : '0.00';
  const winRate = sumResults.length ? (((wins / sumResults.length) * 100).toFixed(1)) : '0.0';
  const lossRate = sumResults.length ? (((losses / sumResults.length) * 100).toFixed(1)) : '0.0';
  avgDuration = records.length ? avgDuration / records.length : 0;
  avgLossDuration = losses ? avgLossDuration / losses : 0;
  avgWinDuration = wins ? avgWinDuration / wins : 0;

  return (
    <>
      <LineChart width={1600} height={600} data={sumResults ?? []} margin={{top: 5, right: 20, bottom: 5, left: 0}}>
        <Line type="monotone" dataKey="sum" stroke="blue" dot={false} strokeWidth={2}/>
        <Line type="monotone" dataKey="gainLoss" stroke="red" dot={false} strokeWidth={1}/>
        <CartesianGrid stroke="#ccc" strokeDasharray="5 5"/>
        <XAxis dataKey={getDateTime}/>
        <YAxis/>
        <Tooltip/>
      </LineChart>
      <div>
        <Space>
          <h1>Wins:</h1>
          <h2>{wins}/{sumResults.length} for {winRate}% win rate.</h2>
          <h2>Avg: ${avgWinText}</h2>
          <h2>Max: ${maxWin.toFixed(2)}</h2>
          <h2>Avg Time: {avgWinDuration.toFixed(1)} min</h2>
          <h2>Total: ${sumWins.toFixed(2)}</h2>
        </Space>
        <br/>
        <Space>
          <h1>Losses:</h1>
          <h2>{losses}/{sumResults.length} for {lossRate}% loss rate.</h2>
          <h2>Avg: ${avgLossText}</h2>
          <h2>Max: ${maxLoss.toFixed(2)}</h2>
          <h2>Avg Time: {avgLossDuration.toFixed(1)} min</h2>
          <h2>Total: ${sumLosses.toFixed(2)}</h2>
        </Space>
        <br/>
        <Space>
          <h1>Average Duration:</h1>
          <h2>{avgDuration.toFixed(1)} min</h2>
        </Space>
        <br/>
        <Space>
          <h1>Totals:</h1>
          <Totals numberOfTrades={sumResults.length} winnings={sumWins} losses={sumLosses} totalGains={resultSum}/>
        </Space>
      </div>
    </>
  );
}

export default ChartResults;