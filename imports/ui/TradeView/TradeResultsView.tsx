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
import {CalculateLimitsAndFees, SetEndOfDay, SetStartOfDay} from '../../Utils';
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

function TradeResultsView() {
  const [isRealTradesOnly, setIsRealTradesOnly] = React.useState(false);
  const [isPrerunTradesOnly, setIsPrerunTradesOnly] = React.useState(false);
  const [filteredRecords, setFilteredRecords] = React.useState([]);
  const [startDate, setStartDate] = React.useState(SetStartOfDay(dayjs()));
  const [endDate, setEndDate] = React.useState(SetEndOfDay(dayjs()));
  const [selectedNames, setSelectedNames] = React.useState([]);
  const [tradeSettingNames, setTradeSettingNames] = React.useState([]);
  const [isGraphPrerunningTrades, setIsGraphPrerunningTrades] = React.useState(false);
  const [warningText, setWarningText] = React.useState('');

  function cleanupTrade(trade: ITradeSettings) {
    CalculateLimitsAndFees(trade);
    if (Number.isNaN(trade.closingPrice)) {
      trade.closingPrice = trade.openingPrice;
      setWarningText(`Warning: some trades had a NaN closing price so we used the opening price.`);
    }
  }

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
    const query = {whyClosed: {$exists: true}};

    if (isRealTradesOnly) {
      query['isMocked'] = false;
    }
    if (isPrerunTradesOnly) {
      query['$or'] = [
        {isPrerunning: true},
        {isPrerunningVWAPSlope: true},
        {isPrerunningVIXSlope: true},
        {isPrerunningGainLimit: true},
      ];
      setIsGraphPrerunningTrades(true);
    } else {
      setIsGraphPrerunningTrades(false);
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
    setWarningText('');
    records.forEach(cleanupTrade);

    setFilteredRecords([...records]);
  }, [Trades, isRealTradesOnly, startDate, endDate, selectedNames, isPrerunTradesOnly]);

  const onStartDateChange = (date: Dayjs) => {
    const value = date ? date : dayjs();
    const result = SetStartOfDay(value);
    setStartDate(result);
  };

  const onEndDateChange = (date: Dayjs) => {
    const value = date ? date : dayjs();
    const result = SetEndOfDay(value);
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
        <h2>
          Prerun Trades Only:
          <Checkbox
            size={'large'}
            style={{marginLeft: '20px'}}
            onChange={(e: CheckboxChangeEvent) => setIsPrerunTradesOnly(e.target.checked)}
            checked={isPrerunTradesOnly}
          />
        </h2>
        <h2>Start Date: <DatePicker onChange={onStartDateChange} defaultValue={startDate}/></h2>
        <h2>End Date: <DatePicker onChange={onEndDateChange} defaultValue={endDate}/></h2>
        <h2>Which Strategies: <NamesSelector names={tradeSettingNames}/></h2>
      </Space>
      <ChartResults records={filteredRecords} isGraphPrerunningTrades={isGraphPrerunningTrades}/>
      <h2 style={{color: 'red'}}>{warningText}</h2>
      <Divider/>
      <TradeResultsTable records={[...filteredRecords].reverse()}/>
    </Space>
  );
}

export default TradeResultsView;