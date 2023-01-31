import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import TradeResults from '../../Collections/TradeResults';
import {ColumnsType} from 'antd/lib/table';
import {Table} from 'antd';
import dayjs from 'dayjs';
import {DeleteOutlined} from '@ant-design/icons';
import ITradeSettings, {GetDescription} from '../../Interfaces/ITradeSettings';
import GraphTrade from './GraphTrade';

function deleteTradeResults(record: ITradeSettings) {
  TradeResults.remove(record._id);
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
    title: 'Opened @ (NY)',
    dataIndex: 'whenOpened',
    defaultSortOrder: 'descend',
    key: 'whenOpened',
    sorter: (a, b) => {
      const aDj = dayjs(a.whenOpened);
      const bDj = dayjs(b.whenOpened);
      return aDj.valueOf() - bDj.valueOf();
    },
  },
  {
    title: 'Closed @ (NY)',
    dataIndex: 'whenClosed',
    defaultSortOrder: 'descend',
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
    title: 'Why',
    key: 'whyClosed',
    dataIndex: 'whyClosed',
  },
  {
    title: 'H:M:S',
    key: 'duration',
    dataIndex: 'monitoredPrices',
    align: 'center',
    render: monitoredPrices => {
      let durationText = '0:0:00';
      if (monitoredPrices?.length > 0) {
        const start = dayjs(monitoredPrices[0].whenNY);
        const end = dayjs(monitoredPrices[monitoredPrices.length - 1].whenNY);
        durationText = dayjs.duration(end.diff(start)).format('H:m:ss');
      }
      return durationText;
    },
  },
  {
    title: 'Gain/time',
    key: 'Gain/time',
    dataIndex: 'monitoredPrices',
    align: 'center',
    render: (_, record) => <GraphTrade liveTrade={record}/>,
  },
];

function TradeResultsTable() {
  const query = {whyClosed: {$exists: true}};
  const opts = {sort: {whenClosed: -1}, limit: 300};
  const tradeResults: ITradeSettings[] = useTracker(() => TradeResults.find(query, opts).fetch());
  return (<Table
      pagination={{pageSize: 10}}
      title={() => <h1>Trade Results</h1>}
      size="small" columns={columns}
      dataSource={tradeResults}
      rowKey="_id"
      rowClassName={(record) => record.isMocked ? 'mockedRow' : 'realTradeRow'}
    />
  );
}

export default TradeResultsTable;