import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import TradeResults from '../../Collections/TradeResults';
import {ColumnsType} from 'antd/lib/table';
import {Table} from 'antd';
import dayjs from 'dayjs';

function TradeResultsTable() {
  const tradeResults: ITradeResults[] = useTracker(() => TradeResults.find({}, {sort: {whenClosed: -1}}).fetch());

  const columns: ColumnsType<ITradeResults> = [
    {
      title: 'Symbol',
      dataIndex: 'symbol',
      key: 'symbol',
      render: text => <a>{text}</a>,
    },
    {
      title: 'Mocked',
      dataIndex: 'isMocked',
      key: 'isMocked',
      render: isMocked => isMocked ? 'true':'false',
      sorter: (a, b) => a.isMocked ? 1:0,
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Opened At (NY)',
      dataIndex: 'whenOpened',
      key: 'whenOpened',
    },
    {
      title: 'Closed At (NY)',
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
      title: 'Opening Price',
      dataIndex: 'openingPrice',
      key: 'openingPrice',
      render: (_, record) => record.openingPrice.toFixed(2)
    },
    {
      title: 'ClosingPrice',
      dataIndex: 'closingPrice',
      key: 'closingPrice',
      render: (_, record) => record.closingPrice.toFixed(2)
    },
    {
      title: 'Gain',
      key: 'gainLoss',
      dataIndex: 'gainLoss',
      sorter: (a, b) => a.gainLoss - b.gainLoss,
      render: (_, {gainLoss}) => {
        let color = (gainLoss < 0) ? 'red' : 'green';
        return (
          <span style={{color: color}} key={gainLoss}>{gainLoss.toFixed(2)}</span>
        );
      },
    },
  ];
  return (<Table style={{maxHeight:5}} pagination={{ pageSize: 5 }} title={()=> <h1>Trade Results</h1>} size="small" columns={columns} dataSource={tradeResults}></Table>);
}

export default TradeResultsTable;