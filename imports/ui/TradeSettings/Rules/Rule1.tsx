import React from 'react';
import {Input, InputNumber, Space} from 'antd';


function Rule1({value, onChange}: { value: number, onChange: (value: number) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>Exit trade if profitable and duration greater than </label>
        <InputNumber
          defaultValue={value}
          addonAfter={'minutes.'}
          min={0}
          max={60}
          style={{width: '150px'}}
          onChange={onChange}/>
      </Space>
    </>
  );
}

export default Rule1;
