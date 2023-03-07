import React, {useEffect} from 'react';
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
import {Checkbox, DatePicker, Divider, Select, Space} from 'antd';
import {CheckboxChangeEvent} from 'antd/lib/checkbox';
import {CalculateLimitsAndFees} from '../../Utils';
// @ts-ignore
import {Meteor} from 'meteor/meteor';

dayjs.extend(customParseFormat);
dayjs.extend(weekday);
dayjs.extend(locale);

function sortFunction(a: ITradeSettings, b: ITradeSettings) {
  const aOpen = dayjs(a.whenOpened);
  const bOpen = dayjs(b.whenOpened);
  const result = aOpen.isBefore(bOpen) ? -1 : 1;
  return result;
}

function setEndOfDay(date: Dayjs) {
  return date.set('hour', 23).set('minute', 59).set('second', 59);
}

function setStartOfDay(date: Dayjs) {
  return date.set('hour', 0).set('minute', 0).set('second', 0);
}

function TradeResultsView() {
  const [isRealTradesOnly, setIsRealTradesOnly] = React.useState(false);
  const [filteredRecords, setFilteredRecords] = React.useState([]);
  const [startDate, setStartDate] = React.useState(setStartOfDay(dayjs()));
  const [endDate, setEndDate] = React.useState(setEndOfDay(dayjs()));
  const [selectedNames, setSelectedNames] = React.useState([]);
  const [tradeSettingNames, setTradeSettingNames] = React.useState([]);

  useEffect(() => {
    Meteor.call('GetTradeSettingNames', (error, names) => {
      if (error) {
        alert(`Failed to get trade setting names. Error: ${error}`);
        return;
      }
      setTradeSettingNames(names);
    });
  }, []);

  useTracker(() => {
    console.log(`Reloading the result trades records list due to a change in the DB.`);
    const query = {whyClosed: {$exists: true}, closingPrice: {$exists: true}};
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
    if (selectedNames.length > 0) {
      query['name'] = {$in: selectedNames};
    }
    const opts = {sort: sortFunction};
    const records: ITradeSettings[] = Trades.find(query, opts).fetch();
    // Recalculate the limits since we've changed that approach several times.
    records.forEach(CalculateLimitsAndFees);
    setFilteredRecords([...records]);
  }, [Trades, isRealTradesOnly, startDate, endDate, selectedNames]);

  const onStartDateChange = (date: Dayjs) => {
    const value = date ? date : dayjs();
    const result = setStartOfDay(value);
    setStartDate(result);
  };

  const onEndDateChange = (date: Dayjs) => {
    const value = date ? date : dayjs();
    const result = setEndOfDay(value);
    setEndDate(result);
  };

  const NamesSelector = ({names}: { names: string[] }) => {
    // @ts-ignore
    const options = names.map((name) => <Select.Option key={name} value={name}>{name}</Select.Option>);
    return (
      <Select mode="multiple" style={{width: 600}} defaultValue={selectedNames} onChange={setSelectedNames}>
        {options}
      </Select>);
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
        <h2>Which Strategies: <NamesSelector names={tradeSettingNames}/></h2>
      </Space>
      <ChartResults records={filteredRecords}/>
      <Divider/>
      <TradeResultsTable records={[...filteredRecords].reverse()}/>
    </Space>
  );
}

export default TradeResultsView;