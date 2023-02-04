import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import Trades from '../../Collections/Trades';
import {ColumnsType} from 'antd/lib/table';
import {Table} from 'antd';
import dayjs from 'dayjs';
import {DeleteOutlined} from '@ant-design/icons';
import ITradeSettings, {GetDescription, whyClosedEnum} from '../../Interfaces/ITradeSettings';
import GraphTrade from './GraphTrade';

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
    render: (description, record) => GetDescription(record),
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
      rowClassName={(record) => record.isMocked ? 'mockedRow' : 'realTradeRow'}
    />
  );
}

export default TradeResultsTable;