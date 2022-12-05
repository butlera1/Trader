import React from 'react';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import LiveTrades from '../../Collections/LiveTrades';
import ITradeSettings from '../../Interfaces/ITradeSettings';
import {ColumnsType} from 'antd/lib/table';
import {Table} from 'antd';

const columns: ColumnsType<ITradeSettings> = [
  {
    title: 'Symbol',
    dataIndex: 'symbol',
    ellipsis: true,
    width: 80,
    key: 'description',
    render: (_, record) => {
      const text = record.description || record.symbol;
      return (<a title={text}>{text}</a>);
    },
  },
  {
    title: 'Mocked',
    dataIndex: 'isMocked',
    width: 80,
    key: 'isMocked',
    align: 'center',
    render: isMocked => isMocked ? 'True' : 'False',
  },
  {
    title: 'Qty',
    dataIndex: 'quantity',
    width: 50,
    align: 'center',
    key: 'quantity',
  },
  {
    title: 'Opened At (NY)',
    dataIndex: 'whenOpened',
    key: 'whenOpened',
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
    title: 'Gain',
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

function ActiveTradesTable() {
  const liveTrades: ITradeSettings[] = useTracker(() => LiveTrades.find({}).fetch());
  return (<Table pagination={{pageSize: 5}} title={() => <h1>Active Trades</h1>} size="small"
                 columns={columns} dataSource={liveTrades}></Table>);
}

export {ActiveTradesTable as default};