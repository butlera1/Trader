import React from 'react';
import {InputNumber, Select, Space} from 'antd';
import IPrerunVIXSlopeValue, {DirectionDown, DirectionUp} from '../../../Interfaces/IPrerunVIXSlopeValue';
import {BuySell} from '../../../Interfaces/ILegSettings';

function PrerunUntilPositiveVIXSlopeAngle({
                                        value,
                                        onChange
                                      }: { value: IPrerunVIXSlopeValue, onChange: (value: IPrerunVIXSlopeValue) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>Prerun: Until VIX Slope Angle is moving</label>
        <Select
          defaultValue={value.direction ?? DirectionUp}
          style={{width: 80}}
          onChange={(direction) => onChange({...value, direction})}>
          <Select.Option value={DirectionUp}>{DirectionUp}</Select.Option>
          <Select.Option value={DirectionDown}>{DirectionDown}</Select.Option>
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
        <label>samples in a row.</label>
      </Space>
    </>
  );
}

export {PrerunUntilPositiveVIXSlopeAngle as default, IPrerunVIXSlopeValue};
