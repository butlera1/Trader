import React from 'react';
import {InputNumber, Space} from 'antd';
import IPrerunSlopeValue from '../../../Interfaces/IPrerunSlopeValue';

function PrerunSlopeRule({value, onChange}: { value: IPrerunSlopeValue, onChange: (value: IPrerunSlopeValue) => void }) {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>Prerun Slope Angle: less than</label>
        <InputNumber
          defaultValue={value.desiredSlopeAngle ?? 1}
          min={0}
          max={90}
          step={1}
          style={{width: '60px'}}
          onChange={(desiredSlopeAngle: number) => onChange({...value, desiredSlopeAngle})}
        />
        <label>&deg; for</label>
        <InputNumber
          defaultValue={value.numberOfDesiredAnglesInARow ?? 10}
          min={0}
          max={100}
          step={1}
          style={{width: '60px'}}
          onChange={(numberOfDesiredAnglesInARow: number) => onChange({...value, numberOfDesiredAnglesInARow})}
        />
        <label>in a row. Using</label>
        <InputNumber
          defaultValue={value.totalSamples ?? 4}
          min={0}
          max={900}
          step={1}
          style={{width: '60px'}}
          onChange={(totalSamples: number) => onChange({...value, totalSamples})}
        />
        <label>total ticks (avg. </label>
        <InputNumber
          defaultValue={value.samplesToAverage ?? 2}
          min={0}
          max={400}
          step={1}
          style={{width: '60px'}}
          onChange={(samplesToAverage: number) => onChange({...value, samplesToAverage})}
        />
        <label>ticks per sample).</label>
      </Space>
      <p style={{marginBottom: 0, marginLeft: 25, color:'hotpink'}}>Remember: 'total ticks' must be greater than 'avg. ticks per sample'.</p>
    </>
  );
}

export {PrerunSlopeRule as default, IPrerunSlopeValue};
