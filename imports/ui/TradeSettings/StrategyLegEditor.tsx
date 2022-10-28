import React from 'react';
import {Button, Col, InputNumber, Row, Select} from 'antd';
import ILegSettings from "../../Interfaces/ILegSettings";
import {DeleteOutlined} from '@ant-design/icons';

function GetUILegs({legs}: { legs: ILegSettings[] }) {
  const results = legs.map((leg) => {
    return (
      <Row key={'leg0'}>
        <Col span={4}>
          <Select defaultValue="Buy" style={{width: 70}}>
            <Select.Option value="Buy">Buy</Select.Option>
            <Select.Option value="Sell">Sell</Select.Option>
          </Select>
        </Col>
        <Col span={4}>
          <Select defaultValue="Call" style={{width: 70}}>
            <Select.Option value="Call">Call</Select.Option>
            <Select.Option value="Put">Put</Select.Option>
          </Select>
        </Col>
        <Col span={5}>
          <InputNumber min={1} max={100} addonAfter={'QTY'} style={{width: '100px'}} defaultValue={1}/>
        </Col>
        <Col span={5}>
          <InputNumber min={0} max={100} addonAfter={'\u0394'} style={{width: '100px'}} defaultValue={1}/>
        </Col>
        <Col span={5}>
          <Button type={'text'} size={'small'} danger>
            <DeleteOutlined/>
          </Button>
        </Col>
      </Row>
    );
  });
  return results;
}

export const StrategyLegEditor = () => {
    const onFinish = (values) => {
      console.log('Success:', values);
    };
    const onFinishFailed = (errorInfo) => {
      console.log('Failed:', errorInfo);
    };
    
    return (
      <div>
        <GetUILegs legs={[]}/>
        <Row>
          <Col>
            <Button
              size="small"
              type={'primary'}
              title={'Add another leg.'}
              style={{marginTop: 10}}
            >+</Button>
          </Col>
        </Row>
      </div>
    );
  }
;
