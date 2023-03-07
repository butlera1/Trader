import React from 'react';
import {InputNumber, Space} from 'antd';

interface IRule1Value {
  profitPercent: number;
  minutes: number;
}

function Rule1({value, onChange}: { value: IRule1Value, onChange: (value: IRule1Value) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>R1: Exit if</label>
        <InputNumber
          defaultValue={(value.profitPercent ?? 0) * 100}
          addonAfter={'%'}
          min={0}
          max={100}
          style={{width: '100px'}}
          onChange={(profitPercent: number) => onChange({...value, profitPercent: profitPercent / 100})}
        />
        <label>of profit and duration over</label>
        <InputNumber
          defaultValue={value.minutes ?? 0}
          addonAfter={'min.'}
          min={0}
          max={60}
          style={{width: '140px'}}
          onChange={(minutes: number) => onChange({...value, minutes})}
        />
      </Space>
    </>
  );
}

export {Rule1 as default, IRule1Value};
