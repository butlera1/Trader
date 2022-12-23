import React from 'react';
import {CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import TradeResults from '../../Collections/TradeResults';
import {Select, Space} from 'antd';

interface ISumResults {
  description: string,
  whenClosed: string,
  gainLoss: number,
  sum: number,
}

function getDescription(record) {
  return record.description ?? `${record.symbol}(${record.quantity ?? 1})`;
}

function ChartResults() {
  const [filterSelections, setFilterSelections] = React.useState([]);
  const [filterList, setFilterList] = React.useState([]);
  const [avgLossText, setAvgLossText] = React.useState('0');
  const [avgWinText, setAvgWinText] = React.useState('0');
  const [winRate, setWinRate] = React.useState('0');
  const [lossRate, setLossRate] = React.useState('0');
  const [wins, setWins] = React.useState(0);
  const [losses, setLosses] = React.useState(0);
  const [avgWin, setAvgWin] = React.useState(0);
  const [avgLoss, setAvgLoss] = React.useState(0);
  const [maxWin, setMaxWin] = React.useState(0);
  const [maxLoss, setMaxLoss] = React.useState(0);

  const tradeResults: ISumResults[] = useTracker(() => {
    const records: ITradeResults[] = TradeResults.find().fetch();
    const sumResults: ISumResults[] = [];
    let winsTmp = 0.0;
    let lossesTmp = 0.0;
    let avgLossTmp = 0;
    let avgWinTmp = 0;
    let maxWinTmp = 0;
    let maxLossTmp = 0;
    const tempFilterList = [];
    records.reduce((sum, record) => {
      const description = getDescription(record);
      if (!tempFilterList.some(item => item.label === description)) {
        tempFilterList.push({label:description, value: description});
      }
      // If record is within the filtering (no filtering then select all).
      if (filterSelections.length === 0 || filterSelections.includes(description)) {
        sum = sum + record.gainLoss;
        sumResults.push({
          description,
          whenClosed: record.whenClosed,
          sum,
          gainLoss: record.gainLoss,
        });
        if (record.gainLoss >= 0.0) {
          winsTmp++;
          avgWinTmp += record.gainLoss;
          if (record.gainLoss > maxWinTmp) {
            maxWinTmp = record.gainLoss;
          }
        } else {
          lossesTmp++;
          avgLossTmp += record.gainLoss;
          if (record.gainLoss < maxLossTmp) {
            maxLossTmp = record.gainLoss;
          }
        }
      }
      return sum;
    }, 0.0);
    setFilterList([...tempFilterList]);
    setAvgLossText((avgLossTmp / lossesTmp).toFixed(2));
    setAvgWinText((avgWinTmp / winsTmp).toFixed(2));
    setWinRate(((winsTmp / sumResults.length) * 100).toFixed(1));
    setLossRate(((lossesTmp / sumResults.length) * 100).toFixed(1));
    setWins(winsTmp);
    setLosses(lossesTmp);
    setAvgLoss(avgLossTmp);
    setAvgWin(avgWinTmp);
    setMaxWin(maxWinTmp);
    setMaxLoss(maxLossTmp);
    return sumResults;
  }, [filterSelections]);

  const handleFilterChange = (value) => {
    setFilterSelections([...value]);
  };

  return (
    <Space>
      <LineChart width={400} height={200} data={tradeResults ?? []} margin={{top: 5, right: 20, bottom: 5, left: 0}}>
        <Line type="monotone" dataKey="sum" stroke="blue"/>
        <Line type="monotone" dataKey="gainLoss" stroke="pink"/>
        <CartesianGrid stroke="#ccc" strokeDasharray="5 5"/>
        <XAxis dataKey="description"/>
        <YAxis/>
        <Tooltip/>
      </LineChart>
      <div>
        <Space>
          <h2>Filter: </h2>
          <Select
            mode="multiple"
            style={{ width: '300px' }}
            placeholder="To Filter data, select ..."
            onChange={handleFilterChange}
            options={filterList}
          />
        </Space>
        <Space>
          <h2>WINS:</h2>
          <h3>{winRate}%</h3>
          <h3>Avg: ${avgWinText}</h3>
          <h3>Max: ${maxWin.toFixed(2)}</h3>
        </Space>
        <Space>
          <h2>Losses:</h2>
          <h3>{lossRate}%</h3>
          <h3>Avg: ${avgLossText}</h3>
          <h3>Max: ${maxLoss.toFixed(2)}</h3>
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