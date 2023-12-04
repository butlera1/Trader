import React from 'react';
import {InputNumber, Space} from 'antd';
import IRule3Value from '../../../Interfaces/IRule3Value';
import IRule4Value from '../../../Interfaces/IRule4Value';

function Rule4({value, onChange}: { value: IRule4Value, onChange: (value: IRule4Value) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>R4: Exit after</label>
        <InputNumber
          defaultValue={value.minutes ?? 0}
          step={1}
          min={0}
          max={99}
          style={{width: '60px'}}
          onChange={(minutes: number) => onChange({...value, minutes})}
        />
        <label>minutes if underlying moved +/-</label>
        <InputNumber
          defaultValue={value.underlyingMovement ?? 0}
          addonAfter={'$'}
          step={0.01}
          min={0}
          max={100}
          style={{width: '120px'}}
          onChange={(underlyingMovement: number) => onChange({...value, underlyingMovement})}
        />
        <label>then exit.</label>
      </Space>
    </>
  );
}

export {Rule4 as default};
