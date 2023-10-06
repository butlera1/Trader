import React from 'react';
import {InputNumber, Space} from 'antd';
import IRule7Value from '../../../Interfaces/IRule7Value';

/**
 * Rule 7: Gain dropped X percent of max loss in Y averaged samples then exit.
 * @param value
 * @param onChange
 * @constructor
 */
function Rule7({value, onChange}: { value: IRule7Value, onChange: (value: IRule7Value) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>R7: Exit if gain dropped </label>
        <InputNumber
          defaultValue={(value.percent * 100) ?? 0}
          step={1}
          min={0}
          max={100}
          style={{width: '50px'}}
          onChange={(percent: number) => onChange({...value, percent: (percent / 100)})}
        />
        <label>% of max loss in </label>
        <InputNumber
          defaultValue={value.samples ?? 0}
          step={1}
          min={0}
          max={500}
          style={{width: '50px'}}
          onChange={(samples: number) => onChange({...value, samples})}
        />
        <label>averaged samples.</label>
      </Space>
    </>
  );
}

export {Rule7 as default};
