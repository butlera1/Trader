import React from "react";
import Backtests from "../../Collections/Backtests";
import {useTracker} from 'meteor/react-meteor-data';
import {DefaultIBacktest, IBacktest} from "../../Interfaces/IBacktest.ts";
import {ColumnsType} from "antd/lib/table";
import {IBacktestSummary} from "../../Interfaces/ITradeSettings.ts";
import {Table} from "antd";
import BacktestSummaryView from "./BacktestSummaryView.tsx";

const columnWidth = 0;

const columns: ColumnsType<IBacktestSummary> = [
  {
    title: 'Total $',
    dataIndex: 'gainLossTotal',
    key: 'Gain/Loss',
    width: columnWidth,
    render: (item, record, index) => {
      const text = `$${(item).toFixed(2)}`;
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
    title: 'Avg. (min)',
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
    title: 'Daily %',
    dataIndex: 'dailyWinRate',
    key: 'dailyWinRate',
    width: columnWidth,
    render: (item, record, index) => {
      const text = `${(item * 100).toFixed(0)}%`;
      return (
        <span key={index}>{text}</span>
      );
    },
    sorter: (a, b) => a.dailyWinRate > b.dailyWinRate ? 1:-1,
  },
  {
    title: 'M %',
    dataIndex: 'dailyWinRate',
    key: 'dailyWinRate',
    width: columnWidth,
    render: (item, record, index) => {
      const wd = `${(record.mondayWinRate*100).toFixed(0)}`;
      return (
        <span key={index}>{wd}</span>
      );
    },
    sorter: (a, b) => a.mondayWinRate - b.mondayWinRate,
  },
  {
    title: 'T %',
    dataIndex: 'dailyWinRate',
    key: 'dailyWinRate',
    width: columnWidth,
    render: (item, record, index) => {
      const wd = `${(record.tuesdayWinRate*100).toFixed(0)}`;
      return (
        <span key={index}>{wd}</span>
      );
    },
    sorter: (a, b) => a.tuesdayWinRate - b.tuesdayWinRate,
  },
  {
    title: 'W %',
    dataIndex: 'dailyWinRate',
    key: 'dailyWinRate',
    width: columnWidth,
    render: (item, record, index) => {
      const wd = `${(record.wednesdayWinRate*100).toFixed(0)}`;
      return (
        <span key={index}>{wd}</span>
      );
    },
    sorter: (a, b) => a.wednesdayWinRate - b.wednesdayWinRate,
  },
  {
    title: 'Th %',
    dataIndex: 'dailyWinRate',
    key: 'dailyWinRate',
    width: columnWidth,
    render: (item, record, index) => {
      const wd = `${(record.thursdayWinRate*100).toFixed(0)}`;
      return (
        <span key={index}>{wd}</span>
      );
    },
    sorter: (a, b) => a.thursdayWinRate - b.thursdayWinRate,
  },
  {
    title: 'F %',
    dataIndex: 'dailyWinRate',
    key: 'dailyWinRate',
    width: columnWidth,
    render: (item, record, index) => {
      const wd = `${(record.fridayWinRate*100).toFixed(0)}`;
      return (
        <span key={index}>{wd}</span>
      );
    },
    sorter: (a, b) => a.fridayWinRate - b.fridayWinRate,
  },
  {
    title: 'Gain Limit',
    dataIndex: 'gainLimit',
    key: 'gainLimit',
    width: columnWidth,
    render: (limit, record) => {
      const prefix = record.isGainLimitDollar ? '$':'';
      const postfix = record.isGainLimitDollar ? '':'%';
      const multiplier = record.isGainLimitDollar ? 100:100;
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
      const multiplier = record.isGainLimitDollar ? 100:100;
      const text = `${prefix}${(limit * multiplier).toFixed(2)}${postfix}`;
      return (
        <span>{text}</span>
      );
    },
    sorter: (a, b) => a.lossLimit > b.lossLimit ? 1:-1,
  },
  {
    title: 'Entry',
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
    title: 'Exit',
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

  if (record.isLoadingHistoricalData) return (<h1>{record.loadingHistoricalData}</h1>);

  if (!record.isOkToRun) return (
    <h1 style={{color: 'red'}}>Backtest: It is not OK to run with {record.estimatedSummariesCount} summaries
      estimated.</h1>
  );

  const doneTextSpan = record.isDone ? <span style={{color: 'green'}}> (Finished)</span>:<></>;
  return (
    <div>
      <h1 key={1}>{record.loadingHistoricalData}</h1>
      <h1 key={2}>TotalTrades: {record.totalTradesCount},
        Summaries: {record.totalSummariesCount} / {record.estimatedSummariesCount}{doneTextSpan}</h1>
    </div>
  );
}

export function BasicBacktestView() {
  const record: IBacktest = useTracker(() => Backtests.findOne({_id: Meteor.userId()}) ?? {...DefaultIBacktest}, [Backtests]);

  return (
    <div>
      <Table
        style={{border: 'solid 1px red'}}
        title={() => title(record)}
        size="small"
        columns={columns}
        dataSource={record.summaries}
        expandable={{
          expandedRowRender: (record) => <BacktestSummaryView summary={record}/>,
          rowExpandable: (record) => true,
        }}>
      </Table>
    </div>
  )
}