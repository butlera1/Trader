import React from 'react';
import {InputNumber, Space} from 'antd';
import IRule2Value from '../../../Interfaces/IRule2Value';

function Rule2({value, onChange}: { value: IRule2Value, onChange: (value: IRule2Value) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>R2: Exit if Inverted-Separation {'>'} </label>
        <InputNumber
          defaultValue={(value.amount ?? 0)}
          addonAfter={'$'}
          min={0}
          max={100}
          style={{width: '110px'}}
          onChange={(amount: number) => onChange({...value, amount})}
        />
        <label>for</label>
        <InputNumber
          defaultValue={value.ticks ?? 0}
          min={0}
          max={100}
          style={{width: '70px'}}
          onChange={(ticks: number) => onChange({...value, ticks})}
        />
        <label>ticks.</label>
      </Space>
    </>
  );
}

export {Rule2 as default, IRule2Value};
