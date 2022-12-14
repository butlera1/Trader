import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import TradeResults from '../../Collections/TradeResults';
import {ColumnsType} from 'antd/lib/table';
import {Table} from 'antd';
import dayjs from 'dayjs';

const columns: ColumnsType<ITradeResults> = [
  {
    title: 'Mocked',
    dataIndex: 'isMocked',
    key: 'isMocked',
    render: isMocked => isMocked ? 'True' : 'False',
    sorter: (a, b) => a.isMocked ? 1 : 0,
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
    render: (description, record) => description ?? `${record.symbol}(${record.quantity})`
  },
  {
    title: 'Closed (NY)',
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
    title: 'Closing Price',
    dataIndex: 'closingPrice',
    key: 'closingPrice',
    render: closingPrice => closingPrice.toFixed(2)
  },
  {
    title: 'Gain',
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
    title: 'Why Closed',
    key: 'whyClosed',
    dataIndex: 'whyClosed',
  },
];

function TradeResultsTable() {
  const tradeResults: ITradeResults[] = useTracker(() => TradeResults.find({}, {sort: {whenClosed: -1}}).fetch());
  return (<Table pagination={{pageSize: 10}} title={() => <h1>Trade Results</h1>} size="small" columns={columns}
                 dataSource={tradeResults}></Table>);
}

export default TradeResultsTable;