import React from 'react';
import {InputNumber, Space} from 'antd';
import IRule5Value from '../../../Interfaces/IRule5Value';

/**
 * Rule 5: After Z minutes, if underlying moved +/- X% of credit, exit. Repeat until H hour.
 * @param value
 * @param onChange
 * @constructor
 */
function Rule5({value, onChange}: { value: IRule5Value, onChange: (value: IRule5Value) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>R5: Exit after</label>
        <InputNumber
          defaultValue={value.minutes ?? 0}
          step={1}
          min={0}
          max={500}
          style={{width: '50px'}}
          onChange={(minutes: number) => onChange({...value, minutes})}
        />
        <label>min. if underlying +/-</label>
        <InputNumber
          defaultValue={(value.underlyingPercentOfCredit * 100) ?? 0}
          step={1}
          min={0}
          max={100}
          style={{width: '50px'}}
          onChange={(underlyingPercentOfCredit: number) => onChange({...value, underlyingPercentOfCredit: (underlyingPercentOfCredit / 100)})}
        />
        <label>% of credit. </label>
      </Space>
    </>
  );
}

export {Rule5 as default};
