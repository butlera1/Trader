import React from 'react';
import {Button, DatePicker, InputNumber, Select, Space} from 'antd';
import {Random} from "meteor/random";
import IRanges from "../../Interfaces/IRanges";
import Ranges from "../../Collections/Ranges.js";
import {Meteor} from "meteor/meteor";
import ITradeSettingsSet from "../../Interfaces/ITradeSettingsSet.ts";
import {useTracker} from "meteor/react-meteor-data";
import TradeSettingsSets from '../../Collections/TradeSettingsSets';
import TradeSettingsSetView from "./TradeSettingsSetView.tsx";

const hours = [
  <Select.Option key={1} value={9}>9</Select.Option>,
  <Select.Option key={2} value={10}>10</Select.Option>,
  <Select.Option key={3} value={11}>11</Select.Option>,
  <Select.Option key={4} value={12}>12</Select.Option>,
  <Select.Option key={5} value={13}>1</Select.Option>,
  <Select.Option key={6} value={14}>2</Select.Option>,
  <Select.Option key={7} value={15}>3</Select.Option>,
  <Select.Option key={8} value={16}>4</Select.Option>,
];

const SetNameSelector = ({width, setSelectedName}) => {
  const sets: ITradeSettingsSet[] = useTracker(() => TradeSettingsSets.find().fetch(), [TradeSettingsSets]);
  const options = sets.map(({_id, name}) => <Select.Option key={_id} value={_id}>{name}</Select.Option>);
  return (
    <Select style={{width: width}} onChange={setSelectedName}>
      {options}
    </Select>);
};

function SecondsEditor({ranges}: { ranges: IRanges }) {
  return (
    <>
      <Space>
        <span>{`Prerun GainLimit Seconds:`}</span>
        <span>{`Start:`}</span>
        <InputNumber
          min={0}
          step="60"
          defaultValue={ranges.startGainLimitPrerunAllowedDurationSeconds}
          max={100000}
          style={{width: '100px'}}
          onChange={(value) => {
            ranges.startGainLimitPrerunAllowedDurationSeconds = value;
            save(ranges);
          }}
        />

        <span>End:</span>
        <InputNumber
          min={0}
          step="60"
          defaultValue={ranges.endGainLimitPrerunAllowedDurationSeconds}
          max={100000}
          style={{width: '100px'}}
          onChange={(value) => {
            ranges.endGainLimitPrerunAllowedDurationSeconds = value;
            save(ranges);
          }}
        />
        <span>Increment:</span>
        <InputNumber
          min={60}
          step="60"
          defaultValue={ranges.gainLimitPrerunAllowedDurationSecondsIncrement}
          max={100000}
          style={{width: '100px'}}
          onChange={(value) => {
            ranges.gainLimitPrerunAllowedDurationSecondsIncrement = value;
            save(ranges);
          }}
        />
      </Space>
    </>
  );
}

function GainLossEditor({ranges, label, isGain}: { ranges: IRanges, label: string, isGain: boolean }) {
  let startPercent = 'startLoss';
  let endPercent = 'endLoss';
  let increment = 'lossIncrement';
  let isDollar = 'lossIsDollar';
  if (isGain) {
    startPercent = 'startGain';
    endPercent = 'endGain';
    increment = 'gainIncrement';
    isDollar = 'gainIsDollar';
  }
  return (
    <>
      <Space>
        <span>{`${label}`}</span>
        <Select value={ranges[isDollar]} style={{width: 60}}
                onChange={(value) => {
                  ranges[isDollar] = value;
                  save(ranges);
                }}>
          <Select.Option value={false}>%</Select.Option>
          <Select.Option value={true}>$</Select.Option>
        </Select>
        <span>{`Start:`}</span>
        <InputNumber
          min={0}
          step="0.01"
          value={Math.round(ranges[startPercent] * 100000) / 1000}
          max={100000}
          style={{width: '100px'}}
          onChange={(value) => {
            ranges[startPercent] = (value) / 100;
            save(ranges);
          }}
        />

        <span>End:</span>
        <InputNumber
          min={0}
          step="0.01"
          max={100000}
          value={Math.round(ranges[endPercent] * 100000) / 1000}
          style={{width: '100px'}}
          onChange={(value) => {
            ranges[endPercent] = (value) / 100;
            save(ranges);
          }}
        />
        <span>Increment:</span>
        <InputNumber
          min={0}
          step="0.01"
          max={100000}
          value={Math.round(ranges[increment] * 100000) / 1000}
          style={{width: '100px'}}
          onChange={(value) => {
            ranges[increment] = (value) / 100;
            save(ranges);
          }}
        />
      </Space>
    </>
  );
}

function save(ranges: IRanges) {
  const _id = ranges._id || Random.id();
  delete ranges._id;
  Ranges.upsert(_id, ranges);
  ranges._id = _id;
}

function RangesEditor({ranges}: { ranges: IRanges }) {
  const [selectedSetId, setSelectedSetId] = React.useState(null);
  if (selectedSetId===null && ranges) {
    ranges.tradeSettingsSetId = null;
  }

  const runBacktest = () => {
    ranges.tradeSettingsSetId = selectedSetId;
    ranges.countOnly = false;
    Meteor.call('BacktestTradeSetMethod', ranges, (error) => {
      if (error) {
        alert(`Error running backtest: ${error}`);
      }
    });
  };

  return (
    <div style={{padding: 25, marginBottom: 25}}>
      <Space direction={'vertical'} size={30}>
        <GainLossEditor label={'Gain range:'} ranges={ranges} isGain={true}/>
        <GainLossEditor label={'Loss range:'} ranges={ranges} isGain={false}/>
        <SecondsEditor ranges={ranges}/>
        <Space>
          <span>Entry Hours Range:</span>
          <Select
            mode='multiple'
            value={ranges.entryHours}
            style={{width: 220}}
            onChange={(values) => {
              ranges.entryHours = values;
              save(ranges);
            }}>
            {hours}
          </Select>
          <span>Exit Hours Range:</span>
          <Select
            mode='multiple'
            defaultValue={ranges.exitHours}
            style={{width: 220}}
            onChange={(values) => {
            ranges.exitHours = values;
            save(ranges);
          }}>
            {hours}
          </Select>
        </Space>
        <Space>
          <label>Start Date: <DatePicker onChange={(value) => {
            ranges.startDate = value.hour(1).toDate();
            save(ranges);
          }}/></label>
          <label>End Date: <DatePicker onChange={(value) => {
            ranges.endDate = value.hour(23).toDate();
            save(ranges);
          }}/></label>
        </Space>
        <Space>
          <span>Select A Trade Pattern Group:</span>
          <SetNameSelector width={400} setSelectedName={setSelectedSetId}/>
        </Space>
        <TradeSettingsSetView setId={selectedSetId}/>
        <Button disabled={(selectedSetId===null)} type="primary" shape="round" onClick={runBacktest}>
          Run Backtest
        </Button>
      </Space>
    </div>
  );
}

export default RangesEditor;