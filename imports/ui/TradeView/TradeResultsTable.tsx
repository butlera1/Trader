import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import Trades from '../../Collections/Trades';
import {ColumnsType} from 'antd/lib/table';
import {Table} from 'antd';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import {DeleteOutlined} from '@ant-design/icons';
import ITradeSettings, {GetDescription, whyClosedEnum} from '../../Interfaces/ITradeSettings';
import GraphTrade from './GraphTrade';

dayjs.extend(utc);
dayjs.extend(timezone);

function GetNewYorkTimeAsText(date: Date) {
  return dayjs(date).tz('America/New_York').format('MM/DD/YY hh:mm A');
}

function deleteTradeResults(record: ITradeSettings) {
  Trades.remove(record._id);
}

const columns: ColumnsType<ITradeSettings> = [
  {
    title: <DeleteOutlined/>,
    key: 'action',
    render: (_: any, record: ITradeSettings) => <a onClick={() => deleteTradeResults(record)}><DeleteOutlined/></a>,
  },
  {
    title: 'Description',
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
    dataIndex: 'whenOpened',
    key: 'whenOpened',
    sorter: (a, b) => {
      const aDj = dayjs(a.whenOpened);
      const bDj = dayjs(b.whenOpened);
      return aDj.valueOf() - bDj.valueOf();
    },
    render: (whenOpened) => GetNewYorkTimeAsText(whenOpened),
  },
  {
    title: 'Closed',
    dataIndex: 'whenClosed',
    key: 'whenClosed',
    sorter: (a, b) => {
      const aDj = dayjs(a.whenClosed);
      const bDj = dayjs(b.whenClosed);
      return aDj.valueOf() - bDj.valueOf();
    },
    render: (whenClosed) => GetNewYorkTimeAsText(whenClosed),
  },
  {
    title: '$ G/L',
    key: 'gainLoss',
    dataIndex: 'gainLoss',
    sorter: (a, b) => a.gainLoss - b.gainLoss,
    render: (gainLoss) => {
      let color = (gainLoss < 0) ? 'red' : 'green';
      return (
        <span style={{color: color}} key={gainLoss}>{gainLoss.toFixed(2)}</span>
      );
    },
  },
  {
    title: 'UOpen',
    dataIndex: 'monitoredPrices',
    key: 'UOpen $',
    align: 'right',
    render: monitoredPrices => monitoredPrices.length > 0 ? monitoredPrices[monitoredPrices.length - 1]?.underlyingPrice ?? 0 : 0,
  },
  {
    title: 'UClose',
    dataIndex: 'monitoredPrices',
    key: 'UPrice $',
    align: 'right',
    render: monitoredPrices => monitoredPrices.length > 0 ? monitoredPrices[0]?.underlyingPrice ?? 0 : 0,
  },
  {
    title: 'Why',
    key: 'whyClosed',
    dataIndex: 'whyClosed',
    render: why => whyClosedEnum[why]?.slice(0, 4),
  },
  {
    title: 'Gain/time',
    key: 'Gain/time',
    dataIndex: 'monitoredPrices',
    align: 'center',
    render: (_, record) => <GraphTrade liveTrade={record}/>,
  },
];

function TradeResultsTable({records}: { records: ITradeSettings[] }) {
  return (<Table
      pagination={{pageSize: 10}}
      size="small" columns={columns}
      dataSource={records}
      rowKey="_id"
    />
  );
}

export default TradeResultsTable;