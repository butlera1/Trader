import React from 'react';
import {InputNumber, Space} from 'antd';
import IPrerunValue from '../../../Interfaces/IPrerunValue';

function PrerunRule({value, onChange}: { value: IPrerunValue, onChange: (value: IPrerunValue) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>Prerun: Until</label>
        <InputNumber
          defaultValue={value.ticks ?? 0}
          min={0}
          max={60}
          step={1}
          style={{width: '60px'}}
          onChange={(ticks: number) => onChange({...value, ticks})}
        />
        <label>ticks with +Separation {'>'}</label>
        <InputNumber
          defaultValue={value.amount ?? 0}
          addonAfter={'$'}
          min={0}
          max={100}
          step={0.01}
          style={{width: '100px'}}
          onChange={(amount: number) => onChange({...value, amount})}
        />
        <label>and +Gain.</label>
      </Space>
    </>
  );
}

export {PrerunRule as default, IPrerunValue};
