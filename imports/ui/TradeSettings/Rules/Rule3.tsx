import React from 'react';
import {InputNumber, Space} from 'antd';
import IRule3Value from '../../../Interfaces/IRule3Value';

function Rule3({value, onChange}: { value: IRule3Value, onChange: (value: IRule3Value) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>R3: </label>
        <InputNumber
          defaultValue={(value.trailingStopPercent * 100 ?? 0)}
          step={1}
          min={0}
          max={100}
          style={{width: '60px'}}
          onChange={(trailingStopPercent: number) => onChange({
            ...value,
            trailingStopPercent: trailingStopPercent / 100
          })}
        />
        <label>% tr stop after</label>
        <InputNumber
          defaultValue={value.gainPercent * 100 ?? 0}
          step={1}
          min={0}
          max={100}
          style={{width: '60px'}}
          onChange={(gainPercent: number) => onChange({...value, gainPercent: gainPercent / 100})}
        />
        <label>% gain and</label>
        <InputNumber
          defaultValue={value.minutes ?? 0}
          step={1}
          min={0}
          max={99}
          style={{width: '60px'}}
          onChange={(minutes: number) => onChange({...value, minutes})}
        />
        <label>minutes.</label>
      </Space>
    </>
  );
}

export {Rule3 as default};
