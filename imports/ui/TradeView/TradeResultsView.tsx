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
  const [startDate, setStartDate] = React.useState(dayjs());
  const [startHour, setStartHour] = React.useState(9);
  const [startMinute, setStartMinute] = React.useState(30);
  const [endDate, setEndDate] = React.useState(dayjs());
  const [endHour, setEndHour] = React.useState(16);
  const [endMinute, setEndMinute] = React.useState(0);
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
      let start = startDate.hour(startHour).minute(startMinute).toDate();
      //start = new Date(start.toLocaleString('en-US', {timeZone: 'Zulu'}));

      start = SetStartOfDay(startDate).toDate();
      query['whenOpened'] = {$gte: start};
    }
    if (endDate) {
      let end = endDate.hour(endHour).minute(endMinute).toDate();
      //end = new Date(end.toLocaleString('en-US', {timeZone: 'Zulu'}));

      end = SetEndOfDay(endDate).toDate();
      query['whenClosed'] = {$lte: end};
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
  }, [Trades, isRealTradesOnly, startDate, endDate, selectedNames, isPrerunTradesOnly,startHour,startMinute,endHour,endMinute]);

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
        <Space>
          <h2>Start Date: <DatePicker onChange={setStartDate} defaultValue={dayjs()}/></h2>
          <h3>Time: <Select defaultValue={startHour} onChange={setStartHour}>
            <Select.Option value={9}>9</Select.Option>
            <Select.Option value={10}>10</Select.Option>
            <Select.Option value={11}>11</Select.Option>
            <Select.Option value={12}>12</Select.Option>
            <Select.Option value={13}>1</Select.Option>
            <Select.Option value={14}>2</Select.Option>
            <Select.Option value={15}>3</Select.Option>
            <Select.Option value={16}>4</Select.Option>
          </Select>:<Select defaultValue={startMinute} onChange={setStartMinute}>
            <Select.Option value={0}>00</Select.Option>
            <Select.Option value={15}>15</Select.Option>
            <Select.Option value={30}>30</Select.Option>
            <Select.Option value={45}>45</Select.Option>
          </Select></h3>
        </Space>
        <Space>
          <h2>End Date: <DatePicker onChange={setEndDate} defaultValue={dayjs()}/></h2>
          <h3>Time: <Select defaultValue={endHour} onChange={setEndHour}>
            <Select.Option value={9}>9</Select.Option>
            <Select.Option value={10}>10</Select.Option>
            <Select.Option value={11}>11</Select.Option>
            <Select.Option value={12}>12</Select.Option>
            <Select.Option value={13}>1</Select.Option>
            <Select.Option value={14}>2</Select.Option>
            <Select.Option value={16}>3</Select.Option>
            <Select.Option value={21}>4</Select.Option>
          </Select>:<Select defaultValue={endMinute} onChange={setEndMinute}>
            <Select.Option value={0}>00</Select.Option>
            <Select.Option value={15}>15</Select.Option>
            <Select.Option value={30}>30</Select.Option>
            <Select.Option value={45}>45</Select.Option>
          </Select></h3>
        </Space>
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