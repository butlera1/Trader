import React from 'react';
import {CartesianGrid, Label, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
import {Space} from 'antd';
import ITradeSettings from '../../Interfaces/ITradeSettings';
import dayjs from 'dayjs';
import {
  AnyPrerunningOn,
  CalculateTotalFees,
  CleanupGainLossWhenFailedClosingTrade,
  GetNewYorkTimeAsText
} from '../../Utils';
import {Meteor} from 'meteor/meteor';
import './CssScaleForChartResults.css';

export interface ISumResults {
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
  const color = totalGains >= 0 ? 'green':'red';
  const ColoredStuff = <span>Result: ${totalGains?.toFixed(2)}</span>;
  return <span style={{color}}>{numberOfTrades} trades, Wins: ${winnings?.toFixed(2)} - Losses:
    ${Math.abs(losses)?.toFixed(2)} = {ColoredStuff}</span>;
}

function getSPXMinMax(spxData) {
  let spxMin = 99999;
  let spxMax = 0;
  spxData.forEach((item) => {
    if (item.mark < spxMin) {
      spxMin = item.mark;
    }
    if (item.mark > spxMax) {
      spxMax = item.mark;
    }
  });
  return {spxMin, spxMax};
}

/**
 * Reduces the SPX data set to the same time range as the trades data set.
 *
 * @param spxData
 * @param records
 */
function timeSliceSPXData(spxData, records) {
  if (!records || records.length===0 || !spxData || spxData.length===0) {
    return spxData;
  }
  let startIndex = 0;
  let endIndex = spxData.length - 1;
  const firstTime = records[0].whenOpened.getTime();
  const lastTime = records[records.length - 1].whenClosed.getTime();
  while (startIndex < spxData.length && spxData[startIndex].whenNY.getTime() < firstTime) {
    startIndex++;
  }
  while (endIndex >= 0 && spxData[endIndex].whenNY.getTime() > lastTime) {
    endIndex--;
  }
  return spxData.slice(startIndex, endIndex);
}

function SPXChart({spxData, spxMin, spxMax, skipSPXChart}) {
  if (skipSPXChart) {
    return null;
  }
  return (
    <LineChart width={1600} height={300} data={spxData ?? []} margin={{top: 5, right: 20, bottom: 5, left: 0}}>
      <Line type="monotone" dataKey="mark" stroke="red" dot={false} strokeWidth={2}/>
      <CartesianGrid stroke="#ccc" strokeDasharray="5 5"/>
      <XAxis dataKey={(record) => GetNewYorkTimeAsText(record.whenNY)}/>
      <YAxis width={90} tick={{fontSize: 10}} allowDecimals={false} domain={[spxMin, spxMax]}>
        <Label
          value={`SPX`}
          angle={-90}
          position="outside"
          fill="#676767"
          fontSize={16}
        />
      </YAxis>
      <Tooltip/>
    </LineChart>
  );
}

function ChartResults({records, isGraphPrerunningTrades, skipSPXChart}: {
  records: ITradeSettings[],
  isGraphPrerunningTrades: boolean,
  skipSPXChart?: boolean,
}) {
  const sumResults: ISumResults[] = [];
  const [spxData, setSPXData] = React.useState([]);
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

  React.useEffect(() => {
    if (skipSPXChart) {
      return;
    }
    Meteor.call('GetSPXData', (error, result) => {
      if (error) {
        console.error(error);
      } else {
        setSPXData(timeSliceSPXData(result, records));
      }
    });
  }, [records]);

  const resultSum = records.reduce((sum, record) => {
    const isAnyPrerunning = AnyPrerunningOn(record);
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
  const avgLossText = losses ? ((avgLossTmp / losses)?.toFixed(2)):'0.00';
  const avgWinText = wins ? ((avgWinTmp / wins)?.toFixed(2)):'0.00';
  const winRate = sumResults.length ? (((wins / sumResults.length) * 100)?.toFixed(1)):'0.0';
  const lossRate = sumResults.length ? (((losses / sumResults.length) * 100)?.toFixed(1)):'0.0';
  avgDuration = wins + losses ? avgDuration / (wins + losses):0;
  avgLossDuration = losses ? avgLossDuration / losses:0;
  avgWinDuration = wins ? avgWinDuration / wins:0;
  const {spxMin, spxMax} = getSPXMinMax(spxData);

  const TextSummary = ({isScaled}: { isScaled: boolean }) => {
    const className = isScaled ? "scaledTextSummary":"";
    return (
      <div className={className}>
        <p>Wins:{wins}/{sumResults.length} for {winRate}% win rate. Avg: ${avgWinText} Max: ${maxWin?.toFixed(2)} Avg
          Time: {avgWinDuration?.toFixed(1)} min Total: ${sumWins?.toFixed(2)}</p>
        <p>Losses: {losses}/{sumResults.length} for {lossRate}% loss rate. Avg: ${avgLossText} Max:
          ${maxLoss?.toFixed(2)} Avg Time: {avgLossDuration?.toFixed(1)} min Total: ${sumLosses?.toFixed(2)}</p>
        <p>Average Duration: {avgDuration?.toFixed(1)} min</p>
        <p>Totals: <Totals numberOfTrades={sumResults.length} winnings={sumWins} losses={sumLosses}
                           totalGains={resultSum}/></p>
      </div>
    );
  };

  const CustomTooltip = ({active, payload, label}) => {
    if (active && payload && payload.length) {
        const items = payload.map((item, index) => <span style={{color: item.color, display: 'block'}} key={index}>{`${item.name} : ${item.value}`}</span>);
        const tradePatternName = payload[0].payload.description.split(':')[0];
      return (
        <div style={{backgroundColor: 'rgba(100, 100, 100, 0.1)'}}>
          <span key={-1}>{label} ({tradePatternName})</span>
          {items}
        </div>
      );
    }
    return null;
  };
  const GainLossChart = ({width, height}: { width: number, height: number }) => {
    return (
      <LineChart width={width} height={height} data={sumResults ?? []} margin={{top: 5, right: 20, bottom: 5, left: 0}}>
        <Line type="monotone" dataKey="sum" stroke="blue" dot={false} strokeWidth={2}/>
        <Line type="monotone" dataKey="gainLoss" stroke="red" dot={false} strokeWidth={1}/>
        <CartesianGrid stroke="#ccc" strokeDasharray="5 5"/>
        <XAxis dataKey={getDateTime}/>
        <YAxis width={90} tick={{fontSize: 10}} allowDecimals={false}>
          <Label
            value={`Results`}
            angle={-90}
            position="outside"
            fill="#676767"
            fontSize={14}
          />
        </YAxis>
        <Tooltip content={<CustomTooltip />} />
      </LineChart>
    );
  };

  if (skipSPXChart) {
    return (
      <Space direction={'horizontal'}>
        <GainLossChart width={800} height={200}/>
        <TextSummary isScaled={true}/>
      </Space>
    );
  }

  return (
    <>
      <GainLossChart width={1600} height={400}/>
      <SPXChart spxData={spxData} spxMin={spxMin} spxMax={spxMax} skipSPXChart={skipSPXChart}/>
      <TextSummary isScaled={false}/>
    </>
  );
}

export default ChartResults;