import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import TradeResultsTable from './TradeResultsTable';
import ChartResults from './ChartResults';
import ITradeSettings from '../../Interfaces/ITradeSettings';
import Trades from '../../Collections/Trades';
import dayjs, {Dayjs} from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import weekday from 'dayjs/plugin/weekday';
import locale from 'dayjs/plugin/localeData';
import {Checkbox, DatePicker, Divider, Space} from 'antd';
import {CheckboxChangeEvent} from 'antd/lib/checkbox';

dayjs.extend(customParseFormat);
dayjs.extend(weekday);
dayjs.extend(locale);

function sortFunction(a: ITradeSettings, b: ITradeSettings) {
  const aOpen = dayjs(a.whenOpened);
  const bOpen = dayjs(b.whenOpened);
  const result = aOpen.isBefore(bOpen) ? -1 : 1;
  return result;
}

function TradeResultsView() {
  const [isRealTradesOnly, setIsRealTradesOnly] = React.useState(false);
  const [filteredRecords, setFilteredRecords] = React.useState([]);
  const [startDate, setStartDate] = React.useState(dayjs().subtract(1, 'year'));
  const [endDate, setEndDate] = React.useState(dayjs());

  useTracker(() => {
    const query = {whyClosed: {$exists: true}};
    if (isRealTradesOnly) {
      query['isMocked'] = false;
    } else {
      delete query['isMocked'];
    }
    if (startDate) {
      query['whenOpened'] = {$gte: startDate.toDate()};
    }
    if (endDate) {
      query['whenClosed'] = {$lte: endDate.toDate()};
    }
    const opts = {sort: sortFunction};
    const records: ITradeSettings[] = Trades.find(query, opts).fetch();
    setFilteredRecords(records);
  }, [Trades, isRealTradesOnly, startDate, endDate]);

  const onStartDateChange = (date: Dayjs) => {
    const result = date.set('hour', 0).set('minute', 0).set('second', 0);
    setStartDate(result);
  };

  const onEndDateChange = (date: Dayjs) => {
    const result = date.set('hour', 23).set('minute', 59).set('second', 59);
    setEndDate(result);
  };

  return (
    <Space direction={'vertical'}>
      <Space direction={'vertical'}>
        <h1>Overall Results</h1>
        <h2>
          Real Trades Only:
          <Checkbox
            size={'large'}
            style={{marginLeft: '20px'}}
            onChange={(e: CheckboxChangeEvent) => setIsRealTradesOnly(e.target.checked)}
            checked={isRealTradesOnly}
          />
        </h2>
        <h2>Start Date: <DatePicker onChange={onStartDateChange} defaultValue={startDate}/></h2>
        <h2>End Date: <DatePicker onChange={onEndDateChange} defaultValue={endDate}/></h2>
      </Space>
      <ChartResults records={filteredRecords}/>
      <Divider/>
      <TradeResultsTable records={[...filteredRecords].reverse()}/>
    </Space>
  );
}

export default TradeResultsView;