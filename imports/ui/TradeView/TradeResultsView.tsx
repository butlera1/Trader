import React, {useEffect} from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import TradeResultsTable from './TradeResultsTable';
import ChartResults from './ChartResults';
import ITradeSettings from '../../Interfaces/ITradeSettings';
import Trades from '../../Collections/Trades';
import dayjs from 'dayjs';
import {Divider} from 'antd';

function sortFunction(a: ITradeSettings, b: ITradeSettings) {
  const aOpen = dayjs(a.whenOpened);
  const bOpen = dayjs(b.whenOpened);
  const result = aOpen.isBefore(bOpen) ? -1 : 1;
  return result;
}

function TradeResultsView() {
  const [filteredRecords, setFilteredRecords] = React.useState([]);

  useEffect(() => {
    const query = {whyClosed: {$exists: true}};
    const opts = {sort: sortFunction};
    const records: ITradeSettings[] = Trades.find(query, opts).fetch();
    setFilteredRecords(records);
  }, []);

  return (
    <>
      <h1>Overall Results</h1>
      <ChartResults records={filteredRecords}/>
      <Divider/>
      <TradeResultsTable records={[...filteredRecords].reverse()}/>
    </>
  );
}

export default TradeResultsView;