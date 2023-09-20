import React from 'react';
import {InputNumber, Space} from 'antd';
import IPrerunVWAPSlopeValue from '../../../Interfaces/IPrerunVWAPSlopeValue';

function PrerunUntilPositiveVWAPAngle({
                                        value,
                                        onChange
                                      }: { value: IPrerunVWAPSlopeValue, onChange: (value: IPrerunVWAPSlopeValue) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>Prerun: Until VWAP Slope Angle is moving up for</label>
        <InputNumber
          defaultValue={value.numberOfDesiredVWAPAnglesInARow ?? 10}
          min={1}
          max={600}
          step={1}
          style={{width: '60px'}}
          onChange={(numberOfDesiredVWAPAnglesInARow: number) => onChange({...value, numberOfDesiredVWAPAnglesInARow})}
        />
        <label>samples in a row.</label>
      </Space>
    </>
  );
}

export {PrerunUntilPositiveVWAPAngle as default, IPrerunVWAPSlopeValue};
