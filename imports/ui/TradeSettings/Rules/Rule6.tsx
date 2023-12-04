import React from 'react';
import {InputNumber, Space} from 'antd';
import IRule6Value from '../../../Interfaces/IRule6Value';

/**
 * Rule 6: After Z minutes, if underlying moved DOWN X% of credit, exit.
 * @param value
 * @param onChange
 * @constructor
 */
function Rule6({value, onChange}: { value: IRule6Value, onChange: (value: IRule6Value) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>R6: Exit after</label>
        <InputNumber
          defaultValue={value.minutes ?? 0}
          step={1}
          min={0}
          max={500}
          style={{width: '70px'}}
          onChange={(minutes: number) => onChange({...value, minutes})}
        />
        <label>min. if underlying is DOWN</label>
        <InputNumber
          defaultValue={(value.underlyingPercentOfCredit * 100) ?? 0}
          step={1}
          min={0}
          max={100}
          style={{width: '70px'}}
          onChange={(underlyingPercentOfCredit: number) => onChange({...value, underlyingPercentOfCredit: (underlyingPercentOfCredit / 100)})}
        />
        <label>% of total original credit/debit. </label>
      </Space>
    </>
  );
}

export {Rule6 as default};
