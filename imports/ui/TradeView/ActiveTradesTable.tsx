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
// @ts-ignore
import GraphTrade from './GraphTrade.tsx';
import './graphTrade.css';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

function calculateGainLossAndPriceDiff(record: ITradeSettings) {
  let gainLoss = 0;
  const monitoredPrices = record.monitoredPrices;
  let priceDiff = '0';
  if (monitoredPrices?.length > 0) {
    gainLoss = (monitoredPrices[monitoredPrices.length - 1].gain);
    priceDiff = (monitoredPrices[monitoredPrices.length - 1].price - record.openingPrice).toFixed(3);
  }
  return {gainLoss, priceDiff};
}

const columns: ColumnsType<ITradeSettings> = [
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
    width: 150,
    render: (_, record) => {
      const description = GetDescription(record);
      let color = (record.isMocked) ? 'white' : 'pink';
      return (
        <span style={{backgroundColor: color}} key={description}>{description}</span>
      );
    },
  },
  {
    title: 'Open $',
    dataIndex: 'openingPrice',
    key: 'openingPrice',
    align: 'right',
    render: (_, record) => record.openingPrice.toFixed(2)
  },
  {
    title: 'Price $',
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
    title: 'UOpen $',
    dataIndex: 'monitoredPrices',
    key: 'UOpen',
    align: 'right',
    render: monitoredPrices => monitoredPrices.length > 0 ? monitoredPrices[0]?.underlyingPrice.toFixed(2) ?? 0 : 0,
  },
  {
    title: 'UPrice $',
    dataIndex: 'monitoredPrices',
    key: 'UPrice',
    align: 'right',
    render: (monitoredPrices, record) => {
      let openUnderyingPrice = 0;
      let priceDiff = '0';
      if (monitoredPrices?.length > 0) {
        openUnderyingPrice = (monitoredPrices[monitoredPrices.length - 1].underlyingPrice);
        priceDiff = (monitoredPrices[0].underlyingPrice - openUnderyingPrice).toFixed(3);
      }
      return (
        <Space direction={'vertical'}>
          <span key={1}>{openUnderyingPrice.toFixed(2)}</span>
          <span key={2}>{`(${priceDiff})`}</span>
        </Space>
      );
    },
  },
  {
    title: 'G/L $',
    key: 'gainLoss',
    dataIndex: 'gainLoss',
    align: 'right',
    render: (_, record) => {
      const {gainLoss, priceDiff} = calculateGainLossAndPriceDiff(record);
      let color = (gainLoss < 0) ? 'red' : 'green';
      const gainLossStr = gainLoss.toFixed(2);
      return (
        <Space direction={'vertical'}>
          <span key={1} style={{color: color}}>{`${gainLossStr}`}</span>
          <span key={2} style={{color: color}}>{`(${priceDiff})`}</span>
        </Space>
      );
    },
  },
  {
    title: 'SStrad $',
    key: 'SStrad $',
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
    title: 'LStrad $',
    key: 'LStrad $',
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
    title: 'Fees $',
    key: 'Fees',
    dataIndex: 'totalFees',
    align: 'center',
    render: (totalFees) => <span key={1} style={{color: 'red'}}>{`${(totalFees ?? 0).toFixed(2)}`}</span>,
  },
  {
    title: 'G/L-Fees $',
    key: 'gainLimitMinusFees',
    dataIndex: 'gainLimit',
    align: 'center',
    render: (_, record) => {
      let {gainLoss, priceDiff} = calculateGainLossAndPriceDiff(record);
      gainLoss = gainLoss - (record.totalFees ?? 0);
      let color = (gainLoss < 0) ? 'red' : 'green';
      const gainLossStr = gainLoss.toFixed(2);
      return (<span key={1} style={{color: color}}>{`${gainLossStr}`}</span>);
    },
  },
  {
    title: 'GainLimit $',
    key: 'gainLimit',
    dataIndex: 'gainLimit',
    align: 'center',
    render: (gainLimit) => gainLimit.toFixed(2),
  },
  {
    title: 'LossLimit $',
    key: 'lossLimit',
    dataIndex: 'lossLimit',
    align: 'center',
    render: (limit) => limit.toFixed(2),
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
    >
    </Table>
  );
}

export {ActiveTradesTable as default};