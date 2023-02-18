import React from 'react';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import Trades from '../../Collections/Trades';
import ITradeSettings, {GetDescription, IPrice} from '../../Interfaces/ITradeSettings';
import {ColumnsType} from 'antd/lib/table';
import {Space, Table} from 'antd';
import EmergencyCloseActiveTrades from '../EmergencyCloseActiveTrades';
// @ts-ignore
import GraphTrade from './GraphTrade.tsx';
import './graphTrade.css';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

function calculateUnderlyingPriceAverageSlope(samples: number, monitoredPrices: IPrice[]) {
  let underlyingSlope = 0;
  if (monitoredPrices?.length > samples * 2) {
    const average = (array: IPrice[]) => array.reduce((a, b) => a + b.underlyingPrice, 0) / array.length;
    let start = monitoredPrices.length - (samples * 2) - 1;
    let end = monitoredPrices.length - samples - 1;
    const average1 = average(monitoredPrices.slice(start, end));
    start = monitoredPrices.length - samples - 1;
    end = monitoredPrices.length - 1;
    const average2 = average(monitoredPrices.slice(start, end));
    underlyingSlope = (average2 - average1); // (y2-y1/x2-x1)
  }
  return underlyingSlope;
}

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
    width: 70,
    render: (_, record) => record.openingPrice.toFixed(2)
  },
  {
    title: 'Price $',
    dataIndex: 'currentPrice',
    key: 'currentPrice',
    align: 'right',
    width: 70,
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
    width: 80,
    render: monitoredPrices => monitoredPrices.length > 0 ? monitoredPrices[0]?.underlyingPrice.toFixed(2) ?? 0 : 0,
  },
  {
    title: 'UPrice $',
    dataIndex: 'monitoredPrices',
    key: 'UPrice',
    align: 'right',
    width: 80,
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
    title: 'USlope1',
    dataIndex: 'monitoredPrices',
    key: 'USlope1',
    align: 'center',
    width: 100,
    render: (monitoredPrices: IPrice[], record) => {
        const underlyingSlope1 = calculateUnderlyingPriceAverageSlope(record.slope1Samples, monitoredPrices);
        const underlyingSlope2 = calculateUnderlyingPriceAverageSlope(record.slope2Samples, monitoredPrices);
      return (
        <Space direction={'vertical'}>
          <span key={'slope1'}>S1: {underlyingSlope1.toFixed(2)}</span>
          <span key={'slope1'}>S2: {underlyingSlope2.toFixed(2)}</span>
        </Space>
      );
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
    width: 80,
    render: (_, {monitoredPrices}) => {
      if (monitoredPrices?.length > 0) {
        return monitoredPrices[monitoredPrices.length - 1].longStraddlePrice?.toFixed(2);
      }
      return 0;
    },
  },
  {
    title: 'G/L-Fees $',
    key: 'gainLimitMinusFees',
    dataIndex: 'gainLimit',
    align: 'center',
    width: 170,
    render: (_, record) => {
      let {gainLoss, priceDiff} = calculateGainLossAndPriceDiff(record);
      const resultGainLoss = gainLoss - (record.totalFees ?? 0);
      let color = (resultGainLoss < 0) ? 'red' : 'green';
      const gainLossStr = `${gainLoss.toFixed(2)} - ${record.totalFees.toFixed(0)} = ${resultGainLoss.toFixed(2)}`;
      return (
        <Space direction={'vertical'}>
          <span key={1} style={{color: color}}>{`${gainLossStr}`}</span>
          <span key={2} style={{color: color}}>{`(${priceDiff})`}</span>
        </Space>
      );
    },
  },
  {
    title: 'Gain/time',
    key: 'Gain/time',
    dataIndex: 'monitoredPrices',
    align: 'left',
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