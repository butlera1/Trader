import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import Trades from '../../Collections/Trades';
import ITradeSettings, {BadDefaultIPrice, GetDescription, IPrice} from '../../Interfaces/ITradeSettings';
import {ColumnsType} from 'antd/lib/table';
import {Space, Table} from 'antd';
import EmergencyCloseActiveTrades from '../EmergencyCloseActiveTrades';
import GraphTrade from './GraphTrade';
import './graphTrade.css';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import './CssActiveTradesTable';
import {GetNewYorkTimeAsText} from '../../Utils';

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
      const prerunText = record.isPrerunning ? ' (Prerun)' : record.isPrerunningSlope ? ' (Prerun Slope)' : '';
      const description = `${GetDescription(record)}${prerunText}`;
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
    render: (_, record) => {
      return (
        <Space direction="vertical">
        <span>{GetNewYorkTimeAsText(record.whenOpened)}</span>
        <span>${record.openingPrice.toFixed(2)}</span>
      </Space>
      );
    }
  },
  {
    title: 'G/L Limits $',
    dataIndex: 'limits',
    key: 'gainLimit',
    align: 'right',
    width: 70,
    render: (_, record) => {
      return (
        <Space direction="vertical">
          <span>{record.gainLimit?.toFixed(2)}</span>
          <span>{record.lossLimit?.toFixed(2)}</span>
        </Space>
      );
    }
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
      let currentUnderlyingPrice = 0;
      let priceDiff = '0';
      if (monitoredPrices?.length > 0) {
        currentUnderlyingPrice = (monitoredPrices[monitoredPrices.length - 1].underlyingPrice);
        priceDiff = (monitoredPrices[0].underlyingPrice - currentUnderlyingPrice).toFixed(3);
      }
      return (
        <Space direction={'vertical'}>
          <span key={1}>{currentUnderlyingPrice.toFixed(2)}</span>
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
      const monitoredPrice = monitoredPrices[monitoredPrices.length - 1] ?? {...BadDefaultIPrice};
      return (
        <Space direction={'vertical'}>
          <span key={'slope1'}>S1: {(monitoredPrice.slope1 ?? 0).toFixed(2)}</span>
          <span key={'slope2'}>S2: {(monitoredPrice.slope2 ?? 0).toFixed(2)}</span>
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
      rowClassName={(record, index) => record.isPrerunning ? 'table-row-prerunning' : 'table-row-normal'}
    >
    </Table>
  );
}

export {ActiveTradesTable as default};