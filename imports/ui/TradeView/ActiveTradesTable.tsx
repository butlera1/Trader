import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import Trades from '../../Collections/Trades';
import ITradeSettings, {GetDescription} from '../../Interfaces/ITradeSettings';
import {ColumnsType} from 'antd/lib/table';
import {Button, Popconfirm, Space, Table} from 'antd';
import EmergencyCloseActiveTrades from '../EmergencyCloseActiveTrades';
import GraphTrade from './GraphTrade';
import './graphTrade.css';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import './CssActiveTradesTable';
import {GetNewYorkTimeAsText} from '../../Utils';
import {QuestionCircleOutlined} from '@ant-design/icons';
// @ts-ignore
import {Meteor} from 'meteor/meteor';

dayjs.extend(duration);

function CloseThisTrade(id: string) {
  Meteor.call('EmergencyCloseSingleTrade', id, (error, result) => {
    if (error) {
      console.log(`Failed calling EmergencyCloseSingleTrade (_id=${id}). ${error.toString()}`);
    }
  });
}

function ExitSingleTrade({id}) {
  return (
    <Popconfirm
      title="Are you sure: CLOSE THIS TRADE?"
      icon={<QuestionCircleOutlined style={{color: 'red'}}/>}
      onConfirm={() => CloseThisTrade(id)}
      okText="Yes"
      cancelText="No"
    >
      <Button
        type="primary"
        shape="round"
        size={'small'}
        danger
      >
        Close This Trade
      </Button>
    </Popconfirm>
  );
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
      const description = `${GetDescription(record)}`;
      let color = (record.isMocked) ? 'white' : 'pink';
      return (
        <span style={{backgroundColor: color}} key={description}>{description}</span>
      );
    },
  },
  {
    title: 'Prices $',
    dataIndex: 'openingPrice',
    key: 'openingPrice',
    align: 'right',
    width: 170,
    render: (_, record) => {
      let currentPrice = Number.NaN;
      let priceDiff = 0;
      if (record.monitoredPrices?.length > 0) {
        currentPrice = record.monitoredPrices[record.monitoredPrices.length - 1].price;
        priceDiff = record.monitoredPrices[record.monitoredPrices.length - 1].gain / 100;
      }
      return (
        <Space direction="vertical">
          <span key={0}>{GetNewYorkTimeAsText(record.whenOpened)}</span>
          <span key={1}>Opened: ${record.openingPrice.toFixed(2)}</span>
          <span key={2}>Current: ${currentPrice.toFixed(2)}</span>
          <span key={3}>Diff: ${priceDiff.toFixed(2)}</span>
        </Space>
      );
    }
  },
  {
    title: 'UPrices $',
    dataIndex: 'monitoredPrices',
    key: 'UPrice',
    align: 'right',
    width: 170,
    render: (monitoredPrices, record) => {
      let currentUnderlyingPrice = 0;
      let initialUnderlyingPrice = 0;
      let priceDiff = '0';
      let dateTimeText = 'No date/time';
      if (monitoredPrices?.length > 0) {
        currentUnderlyingPrice = (monitoredPrices[monitoredPrices.length - 1].underlyingPrice);
        initialUnderlyingPrice = monitoredPrices[0].underlyingPrice;
        priceDiff = (currentUnderlyingPrice - initialUnderlyingPrice).toFixed(3);
        dateTimeText = GetNewYorkTimeAsText(monitoredPrices[monitoredPrices.length - 1].when);
      }
      return (
        <Space direction={'vertical'}>
          <span key={0}>{dateTimeText}</span>
          <span key={1}>UOpened: ${initialUnderlyingPrice.toFixed(2)}</span>
          <span key={2}>UCurrent: ${currentUnderlyingPrice.toFixed(2)}</span>
          <span key={3}>UDiff: ${priceDiff}</span>
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
    title: 'G/L-Fees $',
    key: 'gainLimitMinusFees',
    dataIndex: 'gainLimit',
    align: 'center',
    width: 70,
    render: (_, record) => {
      let {gainLoss, priceDiff} = calculateGainLossAndPriceDiff(record);
      const resultGainLoss = gainLoss - (record.totalFees ?? 0);
      let color = (resultGainLoss < 0) ? 'red' : 'green';
      const gainLossStr = `${gainLoss.toFixed(2)} - ${record.totalFees.toFixed(0)} = ${resultGainLoss.toFixed(2)}`;
      return (
        <span key={1} style={{color: color}}>{`${gainLossStr}`}</span>
      );
    },
  },
  {
    title: 'Graph',
    key: 'Graph',
    dataIndex: 'monitoredPrices',
    align: 'center',
    width: 100,
    render: (monitoredPrices, record) => <GraphTrade liveTrade={record}/>,
  },
  {
    title: 'Actions',
    key: 'Actions',
    dataIndex: '_id',
    align: 'left',
    render: (_id) => <ExitSingleTrade id={_id}/>,
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
      pagination={false}
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