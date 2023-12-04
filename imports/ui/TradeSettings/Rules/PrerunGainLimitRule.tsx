import React from 'react';
import {InputNumber, Space} from 'antd';
import IPrerunGainLimitValue, {defaultPrerunGainLimitValue} from '../../../Interfaces/IPrerunGainLimitValue';

function PrerunGainLimitRule({
                               value,
                               onChange
                             }: { value: IPrerunGainLimitValue, onChange: (value: IPrerunGainLimitValue) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>Prerun: Until GainLimit hit within</label>
        <InputNumber
          defaultValue={value?.seconds ?? defaultPrerunGainLimitValue.seconds}
          min={1}
          max={100000}
          step={1}
          style={{width: '120px'}}
          onChange={(seconds: number) => onChange({...value, seconds})}
        />
        <label>seconds. Any other exit reruns with Prerun on.</label>
      </Space>
    </>
  );
}

export {PrerunGainLimitRule as default};
