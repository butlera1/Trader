import React from 'react';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import Trades from '../../Collections/Trades';
import ITradeSettings, {GetDescription} from '../../Interfaces/ITradeSettings';
import {ColumnsType} from 'antd/lib/table';
import {Space, Table} from 'antd';
import EmergencyCloseActiveTrades from '../EmergencyCloseActiveTrades';
import GraphTrade from './GraphTrade.tsx';
import './graphTrade.css';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

const commissionFee = 0.50;

const columns: ColumnsType<ITradeSettings> = [
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
    width: 150,
    render: (description, record) => GetDescription(record)
  },
  {
    title: 'Open $',
    dataIndex: 'openingPrice',
    key: 'openingPrice',
    align: 'right',
    render: (_, record) => record.openingPrice.toFixed(2)
  },
  {
    title: 'Price',
    dataIndex: 'currentPrice',
    key: 'currentPrice',
    align: 'right',
    render: (_, {monitoredPrices}) => {
      if (monitoredPrices?.length > 0) {
        return monitoredPrices[monitoredPrices.length - 1].price.toFixed(2);
      } else {
        return Number.NaN;
      }
    }
  },
  {
    title: '$ G/L',
    key: 'gainLoss',
    dataIndex: 'gainLoss',
    align: 'right',
    render: (_, {monitoredPrices}) => {
      let gainLoss = 0;
      if (monitoredPrices?.length > 0) {
        gainLoss = monitoredPrices[monitoredPrices.length - 1].gain;
      }
      let color = (gainLoss < 0) ? 'red' : 'green';
      return (
        <span style={{color: color}} key={gainLoss}>{gainLoss.toFixed(2)}</span>
      );
    },
  },
  {
    title: 'SStrad$',
    key: 'SStrad$',
    dataIndex: 'monitoredPrices',
    align: 'center',
    render: (_, {monitoredPrices}) => {
      if (monitoredPrices?.length > 0) {
        return monitoredPrices[monitoredPrices.length - 1].shortStraddlePrice?.toFixed(2);
      }
      return 0;
    },
  },
  {
    title: 'LStrad$',
    key: 'LStrad$',
    dataIndex: 'monitoredPrices',
    align: 'center',
    render: (_, {monitoredPrices}) => {
      if (monitoredPrices?.length > 0) {
        return monitoredPrices[monitoredPrices.length - 1].longStraddlePrice?.toFixed(2);
      }
      return 0;
    },
  },
  {
    title: 'Gain Limit',
    key: 'gainLimit',
    dataIndex: 'gainLimit',
    align: 'right',
    render: (gainLimit, record) => gainLimit?.toFixed(2),
  },
  {
    title: 'Loss Limit',
    key: 'lossLimit',
    dataIndex: 'lossLimit',
    align: 'right',
    render: (lossLimit, record) => lossLimit?.toFixed(2),
  },
  {
    title: 'Fees',
    key: 'Costs',
    dataIndex: 'monitoredPrices',
    align: 'center',
    render: (_, record) => (commissionFee * record.legs.length * record.quantity * 2).toFixed(2),
  },
  {
    title: 'Gain/time',
    key: 'Gain/time',
    dataIndex: 'monitoredPrices',
    align: 'center',
    render: (monitoredPrices, record) => <GraphTrade liveTrade={record}/>,
  },
];

function title() {
  return (
    <Space>
      <h1>Active Trades</h1>
      <EmergencyCloseActiveTrades/>
    </Space>
  );
}

function ActiveTradesTable() {
  const query = {whyClosed: {$exists: false}};
  const opts = {sort: {whenClosed: -1}};
  const liveTrades: ITradeSettings[] = useTracker(() => Trades.find(query, opts).fetch());
  return (
    <Table
      style={{border: 'solid 1px red'}}
      pagination={{pageSize: 5}}
      title={title}
      size="small"
      columns={columns}
      rowKey="_id"
      dataSource={liveTrades}
      rowClassName={(record) => record.isMocked ? 'mockedRow' : 'realTradeRow'}
    >
    </Table>
  );
}

export {ActiveTradesTable as default};