import React from 'react';
import {InputNumber, Space} from 'antd';
import IRule5Value from '../../../Interfaces/IRule5Value';

/**
 * Rule 5: After Z minutes, if underlying moved UP X% of credit, exit.
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
          style={{width: '70px'}}
          onChange={(minutes: number) => onChange({...value, minutes})}
        />
        <label>min. if underlying is UP</label>
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

export {Rule5 as default};
