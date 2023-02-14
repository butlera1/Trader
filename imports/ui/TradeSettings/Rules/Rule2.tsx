import React from 'react';
import {Input, InputNumber, Space} from 'antd';


function Rule2({value, onChange}: { value: number, onChange: (value: number) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>Exit trade if gain within</label>
        <InputNumber
          defaultValue={value * 100}
          addonAfter={'%'}
          min={0}
          max={100}
          style={{width: '100px'}}
          onChange={(value) => onChange(value / 100)}/>
        <label>of gain limit.</label>
      </Space>
    </>
  );
}

export default Rule2;
