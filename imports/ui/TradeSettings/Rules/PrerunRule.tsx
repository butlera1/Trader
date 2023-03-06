import React from 'react';
import {InputNumber, Space} from 'antd';
import IPrerunValue from '../../../Interfaces/IPrerunValue';

function PrerunRule({value, onChange}: { value: IPrerunValue, onChange: (value: IPrerunValue) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>Prerun until</label>
        <InputNumber
          defaultValue={value.ticks ?? 0}
          min={0}
          max={60}
          step={1}
          style={{width: '70px'}}
          onChange={(ticks: number) => onChange({...value, ticks})}
        />
        <label>ticks with</label>
        <InputNumber
          defaultValue={value.cents ?? 0}
          addonAfter={'\u00A2'}
          min={0}
          max={100}
          step={0.1}
          style={{width: '120px'}}
          onChange={(cents: number) => onChange({...value, cents})}
        />
        <label>+separation and +gain.</label>
      </Space>
    </>
  );
}

export {PrerunRule as default, IPrerunValue};
