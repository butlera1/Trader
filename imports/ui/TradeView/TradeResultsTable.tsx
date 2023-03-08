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
import {CalculateTotalFees} from '../../Utils';
import './CssActiveTradesTable';

dayjs.extend(utc);
dayjs.extend(timezone);

function GetNewYorkTimeAsText(date: Date) {
  return dayjs(date).tz('America/New_York').format('MM/DD/YY hh:mm A');
}

function deleteTradeResults(record: ITradeSettings) {
  Trades.remove(record._id);
}

function RenderOpenOrClosedData(when, price, under) {
  return (
    <Space direction="vertical">
      <span>{when}</span>
      <span>${price}</span>
      <span>${under}</span>
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
    width: 150,
    dataIndex: 'whenOpened',
    key: 'whenOpened',
    sorter: (a, b) => {
      const aDj = dayjs(a.whenOpened);
      const bDj = dayjs(b.whenOpened);
      return aDj.valueOf() - bDj.valueOf();
    },
    render: (when, record) => {
      const under = record.monitoredPrices.length > 0 ? record.monitoredPrices[0]?.underlyingPrice ?? 0 : 0;
      return RenderOpenOrClosedData(GetNewYorkTimeAsText(when), record.openingPrice.toFixed(2), under.toFixed(2));
    }
  },
  {
    title: 'Closed',
    width: 150,
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
      const priceDiff = record.openingPrice > 0 ? record.closingPrice - record.openingPrice  : record.closingPrice - Math.abs(record.openingPrice);
      const priceDiffAll = `${record.closingPrice?.toFixed(2)} (${(priceDiff).toFixed(3)})`;
      const underDiff = `${under.toFixed(2)} (${(initialUnder - under).toFixed(3)})`;
      return RenderOpenOrClosedData(GetNewYorkTimeAsText(when), priceDiffAll, underDiff);
    },
  },
  {
    title: 'Why',
    key: 'whyClosed',
    width: 150,
    align: 'center',
    dataIndex: 'whyClosed',
    render: why => why?.slice(0, 10),
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
    title: 'LStrad $',
    key: 'LStrad $',
    dataIndex: 'monitoredPrices',
    align: 'center',
    width: 80,
    render: (_, {monitoredPrices}) => {
      if (monitoredPrices?.length > 0) {
        return (
          <Space direction={'vertical'}>
            <span key={'up1'}>Open: {monitoredPrices[0].longStraddlePrice?.toFixed(2)}</span>
            <span key={'up2'}>Closed: {monitoredPrices[monitoredPrices.length - 1].longStraddlePrice?.toFixed(2)}</span>
          </Space>
        );
      }
      return 0;
    },
  },
  {
    title: 'Fees',
    key: 'Fees',
    dataIndex: 'totalFees',
    align: 'center',
    render: (totalFees) => <span key={1} style={{color: 'red'}}>{`${(totalFees ?? 0).toFixed(2)}`}</span>,
  },
  {
    title: '$ G/L',
    key: 'gainLoss',
    width: 100,
    align: 'center',
    dataIndex: 'gainLoss',
    sorter: (a, b) => a.gainLoss - b.gainLoss,
    render: (gainLoss, record) => {
      const totalFees = CalculateTotalFees(record);
      gainLoss = gainLoss - totalFees;
      let color = (gainLoss < 0) ? 'red' : 'green';
      return (
        <span style={{color: color}} key={gainLoss}>{gainLoss.toFixed(2)}</span>
      );
    },
  },
  {
    title: 'Gain/time',
    key: 'Gain/time',
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