import React from 'react';
import {InputNumber, Space} from 'antd';
import IPrerunVIXSlopeValue from '../../../Interfaces/IPrerunVIXSlopeValue';

function PrerunUntilPositiveVIXSlopeAngle({
                                        value,
                                        onChange
                                      }: { value: IPrerunVIXSlopeValue, onChange: (value: IPrerunVIXSlopeValue) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>Prerun: Until VIX Slope Angle is moving up for</label>
        <InputNumber
          defaultValue={value.numberOfDesiredVIXAnglesInARow ?? 10}
          min={1}
          max={600}
          step={1}
          style={{width: '60px'}}
          onChange={(numberOfDesiredVIXAnglesInARow: number) => onChange({...value, numberOfDesiredVIXAnglesInARow})}
        />
        <label>samples in a row.</label>
      </Space>
    </>
  );
}

export {PrerunUntilPositiveVIXSlopeAngle as default, IPrerunVIXSlopeValue};
