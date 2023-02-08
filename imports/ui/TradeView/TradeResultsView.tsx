import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import TradeResultsTable from './TradeResultsTable';
import ChartResults from './ChartResults';
import ITradeSettings from '../../Interfaces/ITradeSettings';
import Trades from '../../Collections/Trades';
import dayjs from 'dayjs';
import {Checkbox, Divider, Space} from 'antd';
import {CheckboxChangeEvent} from 'antd/lib/checkbox';

function sortFunction(a: ITradeSettings, b: ITradeSettings) {
  const aOpen = dayjs(a.whenOpened);
  const bOpen = dayjs(b.whenOpened);
  const result = aOpen.isBefore(bOpen) ? -1 : 1;
  return result;
}

function TradeResultsView() {
  const [isRealTradesOnly, setIsRealTradesOnly] = React.useState(false);
  const [filteredRecords, setFilteredRecords] = React.useState([]);

  useTracker(() => {
    const query = {whyClosed: {$exists: true}};
    if (isRealTradesOnly) {
      query['isMocked'] = false;
    } else {
      delete query['isMocked'];
    }
    const opts = {sort: sortFunction};
    const records: ITradeSettings[] = Trades.find(query, opts).fetch();
    setFilteredRecords(records);
  }, [Trades, isRealTradesOnly]);

  return (
    <Space direction={'vertical'}>
      <Space direction={'vertical'}>
        <h1>Overall Results</h1>
        <Checkbox
          onChange={(e: CheckboxChangeEvent) => setIsRealTradesOnly(e.target.checked)}
          checked={isRealTradesOnly}
        >
          Real Trades Only
        </Checkbox>
      </Space>
      <ChartResults records={filteredRecords}/>
      <Divider/>
      <TradeResultsTable records={[...filteredRecords].reverse()}/>
    </Space>
  );
}

export default TradeResultsView;