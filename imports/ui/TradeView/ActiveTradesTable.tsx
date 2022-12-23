import React from 'react';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import LiveTrades from '../../Collections/LiveTrades';
import ITradeSettings, {GetDescription} from '../../Interfaces/ITradeSettings';
import {ColumnsType} from 'antd/lib/table';
import {Space, Table} from 'antd';
import EmergencyCloseActiveTrades from '../EmergencyCloseActiveTrades';

const columns: ColumnsType<ITradeSettings> = [
  {
    title: 'Mocked',
    dataIndex: 'isMocked',
    key: 'isMocked',
    align: 'center',
    render: isMocked => isMocked ? 'True' : 'False',
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
    render: (description, record) => GetDescription(record)
  },
  {
    title: 'Opening Price',
    dataIndex: 'openingPrice',
    key: 'openingPrice',
    align: 'right',
    render: (_, record) => record.openingPrice.toFixed(2)
  },
  {
    title: 'Current Price',
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
    title: '$ Gain',
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
    title: 'Gain Limit',
    key: 'gainLimit',
    dataIndex: 'gainLimit',
    align: 'right',
    render: gainLimit => gainLimit.toFixed(2),
  },
  {
    title: 'Loss Limit',
    key: 'lossLimit',
    dataIndex: 'lossLimit',
    align: 'right',
    render: lossLimit => lossLimit.toFixed(2),
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
  const liveTrades: ITradeSettings[] = useTracker(() => LiveTrades.find({}).fetch());
  return (
    <Table
      style={{border: 'solid 1px red'}}
      pagination={{pageSize: 5}}
      title={title}
      size="small"
      columns={columns}
      dataSource={liveTrades}>
    </Table>
  );
}

export {ActiveTradesTable as default};