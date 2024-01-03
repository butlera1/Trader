import React, {useEffect} from 'react';
import {useTracker} from 'meteor/react-meteor-data';
import TradeResultsTable from './TradeResultsTable';
import ChartResults from './ChartResults';
import ITradeSettings from '../../Interfaces/ITradeSettings';
import Trades from '../../Collections/Trades';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import weekday from 'dayjs/plugin/weekday';
import locale from 'dayjs/plugin/localeData';
import {Checkbox, DatePicker, Divider, Select, Space} from 'antd';
import {CheckboxChangeEvent} from 'antd/lib/checkbox';
import {CalculateLimitsAndFees, GetNewYorkTimeAt} from '../../Utils';
import {Meteor} from 'meteor/meteor';

dayjs.extend(customParseFormat);
dayjs.extend(weekday);
dayjs.extend(locale);

function sortFunction(a: ITradeSettings, b: ITradeSettings) {
  const aOpen = dayjs(a.whenOpened);
  const bOpen = dayjs(b.whenOpened);
  const result = aOpen.isBefore(bOpen) ? -1:1;
  return result;
}

function EditTime({hour, setHour, minute, setMinute}) {
  return (
    <h3>Time: <Select defaultValue={hour} onChange={setHour}>
      <Select.Option value={9}>9</Select.Option>
      <Select.Option value={10}>10</Select.Option>
      <Select.Option value={11}>11</Select.Option>
      <Select.Option value={12}>12</Select.Option>
      <Select.Option value={13}>1</Select.Option>
      <Select.Option value={14}>2</Select.Option>
      <Select.Option value={15}>3</Select.Option>
      <Select.Option value={16}>4</Select.Option>
    </Select>:<Select defaultValue={minute} onChange={setMinute}>
      <Select.Option value={0}>00</Select.Option>
      <Select.Option value={5}>05</Select.Option>
      <Select.Option value={10}>10</Select.Option>
      <Select.Option value={15}>15</Select.Option>
      <Select.Option value={20}>20</Select.Option>
      <Select.Option value={25}>25</Select.Option>
      <Select.Option value={30}>30</Select.Option>
      <Select.Option value={35}>35</Select.Option>
      <Select.Option value={40}>40</Select.Option>
      <Select.Option value={45}>45</Select.Option>
      <Select.Option value={50}>50</Select.Option>
      <Select.Option value={55}>55</Select.Option>
    </Select></h3>
  );
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

  useTracker(() => {
    Meteor.call('GetTradeSettingNames', (error, namesAndIds) => {
      if (error) {
        alert(`Failed to get trade setting names. Error: ${error}`);
        return;
      }
      if (namesAndIds && namesAndIds.length) {
        setTradeSettingNames(namesAndIds.map(record => record.name).filter(name => name));
      }
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
      const ny = GetNewYorkTimeAt(startHour, startMinute).date(startDate.date()).month(startDate.month()).year(startDate.year());
      query['whenOpened'] = {$gte: ny.toDate()};
    }
    if (endDate) {
      const ny = GetNewYorkTimeAt(endHour, endMinute).date(endDate.date()).month(endDate.month()).year(endDate.year());
      query['whenClosed'] = {$lte: ny.toDate()};
    }
    if (selectedNames.length > 0) {
      query['name'] = {$in: selectedNames};
    }
    const opts = {sort: sortFunction};
    const records: ITradeSettings[] = Trades.find(query, opts).fetch();
    // Recalculate the limits since we've changed that approach several times.
    setWarningText('');
    records.forEach(cleanupTrade);

    setFilteredRecords([...records.sort((a, b) => a.whenClosed.getTime() - b.whenClosed.getTime())]);
  }, [Trades, isRealTradesOnly, startDate, endDate, selectedNames, isPrerunTradesOnly, startHour, startMinute, endHour, endMinute]);

  const NamesSelector = ({names}: { names: string[] }) => {
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
          <EditTime hour={startHour} minute={startMinute} setHour={setStartHour} setMinute={setStartMinute}/>
        </Space>
        <Space>
          <h2>End Date: <DatePicker onChange={setEndDate} defaultValue={dayjs()}/></h2>
          <EditTime hour={endHour} minute={endMinute} setHour={setEndHour} setMinute={setEndMinute}/>
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