import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import Trades from '../../Collections/Trades';
import {ColumnsType} from 'antd/lib/table';
import {Space, Table} from 'antd';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import {DeleteOutlined} from '@ant-design/icons';
import ITradeSettings, {GetDescription, whyClosedEnum} from '../../Interfaces/ITradeSettings';
// @ts-ignore
import GraphTrade from './GraphTrade.tsx';
import {CalculateGain, CalculateTotalFees, CleanupGainLossWhenFailedClosingTrade, GetNewYorkTimeAsText} from '../../Utils';
import './CssActiveTradesTable';

dayjs.extend(utc);
dayjs.extend(timezone);

function deleteTradeResults(record: ITradeSettings) {
  Trades.remove(record._id);
}

function RenderOpenOrClosedData(when, price, under, whyClosed) {
  const nyWhen = GetNewYorkTimeAsText(when);
  return (
    <Space direction="vertical">
      <span>{nyWhen}</span>
      <span>${price}</span>
      <span>${under}</span>
      <span>{whyClosed}</span>
    </Space>
  )
}

const columns: ColumnsType<ITradeSettings> = [
  {
    title: <DeleteOutlined/>,
    key: 'action',
    render: (_: any, record: ITradeSettings) => <a onClick={() => deleteTradeResults(record)}><DeleteOutlined/></a>,
  },
  {
    title: 'Description',
    width: 200,
    dataIndex: 'description',
    key: 'description',
    render: (_, record) => {
      const description = GetDescription(record);
      let color = (record.isMocked) ? 'white' : 'pink';
      return (
        <span style={{backgroundColor: color}} key={description}>{description}</span>
      );
    },
    sorter: (a, b) => GetDescription(a).localeCompare(GetDescription(b)),
  },
  {
    title: 'Opened',
    width: 170,
    dataIndex: 'whenOpened',
    key: 'whenOpened',
    sorter: (a, b) => {
      const aDj = dayjs(a.whenOpened);
      const bDj = dayjs(b.whenOpened);
      return aDj.valueOf() - bDj.valueOf();
    },
    render: (when, record) => {
      const under = record.monitoredPrices.length > 0 ? record.monitoredPrices[0]?.underlyingPrice ?? 0 : 0;
      return RenderOpenOrClosedData(when, record.openingPrice.toFixed(2), under.toFixed(2), '');
    }
  },
  {
    title: 'Closed',
    width: 170,
    dataIndex: 'whenClosed',
    key: 'whenClosed',
    sorter: (a, b) => {
      const aDj = dayjs(a.whenClosed);
      const bDj = dayjs(b.whenClosed);
      return aDj.valueOf() - bDj.valueOf();
    },
    render: (when, record) => {
      // Show the closing price, the difference from open to close, the closing underlying price, and its difference.
      const initialUnder = record.monitoredPrices.length > 0 ? record.monitoredPrices[0]?.underlyingPrice ?? 0 : 0;
      const under = record.monitoredPrices.length > 0 ? record.monitoredPrices[record.monitoredPrices.length - 1]?.underlyingPrice ?? 0 : 0;
      const priceDiff = record.gainLoss;
      const priceDiffAll = `${record.closingPrice?.toFixed(2)} (${(priceDiff).toFixed(3)})`;
      const underDiff = `${under.toFixed(2)} (${(under - initialUnder).toFixed(3)})`;
      return RenderOpenOrClosedData(when, priceDiffAll, underDiff, record.whyClosed);
    },
  },
  {
    title: 'SStrad $',
    key: 'SStrad $',
    dataIndex: 'monitoredPrices',
    align: 'center',
    width: 80,
    render: (_, {monitoredPrices}) => {
      if (monitoredPrices?.length > 0) {
        return (
          <Space direction={'vertical'}>
            <span key={'up1'}>Open: {monitoredPrices[0].shortStraddlePrice?.toFixed(2)}</span>
            <span key={'up2'}>Closed: {monitoredPrices[monitoredPrices.length - 1].shortStraddlePrice?.toFixed(2)}</span>
          </Space>
        );
      }
      return 0;
    },
  },
  {
    title: 'G/L-Fees = $',
    key: 'gainLoss',
    width: 150,
    align: 'center',
    dataIndex: 'gainLoss',
    sorter: (a, b) => a.gainLoss - b.gainLoss,
    render: (_, record) => {
      const totalFees = CalculateTotalFees(record);
      CleanupGainLossWhenFailedClosingTrade(record);
      let gainLoss = record.gainLoss - totalFees;
      let color = (gainLoss < 0) ? 'red' : 'green';
      const gainLossStr = `${record.gainLoss.toFixed(2)} - ${record.totalFees.toFixed(0)} = ${gainLoss.toFixed(2)}`;
      return (
        <span style={{color: color}} key={gainLoss}>{gainLossStr}</span>
      );
    },
  },
  {
    title: 'Graph',
    key: 'Graph',
    dataIndex: 'monitoredPrices',
    align: 'left',
    render: (_, record) => <GraphTrade liveTrade={record}/>,
  },
];

function TradeResultsTable({records}: { records: ITradeSettings[] }) {
  return (<Table
      pagination={{pageSize: 10}}
      size="small" columns={columns}
      dataSource={records}
      rowKey="_id"
      rowClassName={(record) => record.isPrerunning ? 'table-row-prerunning' : 'table-row-normal'}
    />
  );
}

export default TradeResultsTable;