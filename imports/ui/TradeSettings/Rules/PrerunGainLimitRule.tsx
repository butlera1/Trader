import React from 'react';
import {Space} from 'antd';

function PrerunGainLimitRule() {
  return (
    <>
      <Space style={{marginLeft: 10}}>
        <label>Prerun: Until GainLimit hit. Any other trade exit will rerun trade with Prerun on again.</label>
      </Space>
    </>
  );
}

export {PrerunGainLimitRule as default};
