import React from "react";
import Backtests from "../../Collections/Backtests";
import {useTracker} from 'meteor/react-meteor-data';
import {DefaultIBacktest, IBacktest} from "../../Interfaces/IBacktest.ts";
import {ColumnsType} from "antd/lib/table";
import {IBacktestSummary} from "../../Interfaces/ITradeSettings.ts";
import {Table} from "antd";
import {Random} from 'meteor/random';

const columnWidth = 1;

const columns: ColumnsType<IBacktestSummary> = [
  {
    title: 'Total $',
    dataIndex: 'gainLossTotal',
    key: 'Gain/Loss',
    width: columnWidth,
    render: (item, record, index) => {
      const text = `$${(item * 100).toFixed(2)}`;
      return (
        <span key={index}>{text}</span>
      );
    },
    sorter: (a, b) => a.gainLossTotal > b.gainLossTotal ? 1:-1,
  },
  {
    title: 'Win Rate',
    dataIndex: 'winRate',
    key: 'totalGain',
    width: columnWidth,
    render: (item, record, index) => {
      const text = `${(item * 100).toFixed(1)}%`;
      return (
        <span key={index}>{text}</span>
      );
    },
    sorter: (a, b) => a.winRate > b.winRate ? 1:-1,
  },
  {
    title: 'Wins | Losses',
    dataIndex: 'wins',
    key: 'wins',
    width: columnWidth,
    render: (item, record, index) => {
      const text = `${record.wins} | ${record.losses}`;
      return (
        <span key={index}>{text}</span>
      );
    },
    sorter: (a, b) => a.wins > b.wins ? 1:-1,
  },
  {
    title: 'Avg. Duration (min)',
    dataIndex: 'averageDurationMin',
    key: 'averageDurationMin',
    width: columnWidth,
    render: (item, record, index) => {
      const text = `${record.averageDurationMin.toFixed(1)}`;
      return (
        <span key={index}>{text}</span>
      );
    },
    sorter: (a, b) => a.winRate > b.winRate ? 1:-1,
  },
  {
    title: 'Gain Limit',
    dataIndex: 'gainLimit',
    key: 'gainLimit',
    width: columnWidth,
    render: (limit, record) => {
      const prefix = record.isGainLimitDollar ? '$':'';
      const postfix = record.isGainLimitDollar ? '':'%';
      const multiplier = record.isGainLimitDollar ? 1:100;
      const text = `${prefix}${(limit * multiplier).toFixed(2)}${postfix}`;
      return (
        <span>{text}</span>
      );
    },
    sorter: (a, b) => a.gainLimit > b.gainLimit ? 1:-1,
  },
  {
    title: 'Loss Limit',
    dataIndex: 'lossLimit',
    key: 'lossLimit',
    width: columnWidth,
    render: (limit, record) => {
      const prefix = record.isLossLimitDollar ? '$':'';
      const postfix = record.isLossLimitDollar ? '':'%';
      const multiplier = record.isGainLimitDollar ? 1:100;
      const text = `${prefix}${(limit * multiplier).toFixed(2)}${postfix}`;
      return (
        <span>{text}</span>
      );
    },
    sorter: (a, b) => a.lossLimit > b.lossLimit ? 1:-1,
  },
  {
    title: 'Entry Hour',
    dataIndex: 'entryHour',
    key: 'entryHour',
    width: columnWidth,
    render: (hour) => {
      const text = hour > 12 ? `${hour - 12}pm`:`${hour}am`;
      return (
        <span>{text}</span>
      );
    },
    sorter: (a, b) => a.entryHour > b.entryHour ? 1:-1,
  },
  {
    title: 'Exit Hour',
    dataIndex: 'exitHour',
    key: 'exitHour',
    width: columnWidth,
    render: (hour) => {
      const text = hour > 12 ? `${hour - 12}pm`:`${hour}am`;
      return (
        <span>{text}</span>
      );
    },
    sorter: (a, b) => a.exitHour > b.exitHour ? 1:-1,
  },
  {
    title: 'Prerun Secs',
    dataIndex: 'prerunGainLimitValueSeconds',
    key: 'prerunGainLimitValueSeconds',
    width: columnWidth,
    render: (prerunGainLimitValueSeconds) => {
      return (
        <span>{prerunGainLimitValueSeconds}</span>
      );
    },
    sorter: (a, b) => a.prerunGainLimitValueSeconds > b.prerunGainLimitValueSeconds ? 1:-1,
  },
];

function title(record: IBacktest) {
  if (!record) return (<h1>Backtest: No record</h1>);
  if (!record.isOkToRun) return (
    <h1 style={{color: 'red'}}>Backtest: It is not OK to run with {record.estimatedSummariesCount} summaries
      estimated.</h1>);
  return (
    <h1>Backtest: totalTrades: {record.totalTradesCount}, Summaries: {record.totalSummariesCount} out
      of {record.estimatedSummariesCount},
      isDone: {record.isDone ? 'Yup':'Nope'}</h1>
  );
}

export function BasicBacktestView() {
  const record: IBacktest = useTracker(() => Backtests.findOne({_id: Meteor.userId()}) ?? {...DefaultIBacktest}, [Backtests]);

  return (
    <div>
      <Table
        style={{border: 'solid 1px red'}}
        scroll={{x: 1000, y: 200}}
        pagination={false}
        title={() => title(record)}
        size="small"
        columns={columns}
        rowKey={() => Random.id()}
        dataSource={record.summaries}
      >
      </Table>
    </div>
  )
}