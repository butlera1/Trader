import React from 'react';
import {InputNumber, Select, Space} from 'antd';
import IPrerunVIXSlopeValue, {DirectionDown, DirectionUp} from '../../../Interfaces/IPrerunVIXSlopeValue';

function PrerunUntilPositiveVIXSlopeAngle({
                                            value,
                                            onChange
                                          }: { value: IPrerunVIXSlopeValue, onChange: (value: IPrerunVIXSlopeValue) => void }) {
  const posNegText = value.direction === DirectionUp ? 'positive' : 'negative';

  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>Prerun: Until VIX Slope Angle is</label>
        <Select
          defaultValue={value.direction ?? DirectionUp}
          style={{width: 120}}
          onChange={(direction) => onChange({...value, direction})}>
          <Select.Option value={DirectionUp}>increasing</Select.Option>
          <Select.Option value={DirectionDown}>decreasing</Select.Option>
        </Select>
        <label>for</label>
        <InputNumber
          defaultValue={value.numberOfDesiredVIXAnglesInARow ?? 10}
          min={1}
          max={600}
          step={1}
          style={{width: '60px'}}
          onChange={(numberOfDesiredVIXAnglesInARow: number) => onChange({...value, numberOfDesiredVIXAnglesInARow})}
        />
        <label>{`${posNegText} samples in a row.`}</label>
      </Space>
    </>
  );
}

export {PrerunUntilPositiveVIXSlopeAngle as default, IPrerunVIXSlopeValue};
