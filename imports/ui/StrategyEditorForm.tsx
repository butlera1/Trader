import React from 'react';
import {Button, Form, Input, InputNumber, Radio, Select, Space, Switch, TimePicker} from 'antd';
import moment from 'moment';
import ITradeSettings from '../Interfaces/ITradeSettings';

const disabledTime = () => {
  return {
    disabledHours: () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 17, 18, 19, 20, 21, 22, 23],
    disabledMinutes: () => [],
    disabledSeconds: () => [],
  }
};

type Props = {
  tradeSettings: ITradeSettings,
}
export const StrategyEditorForm = () => {
  const onFinish = (values) => {
    console.log('Success:', values);
  };
  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };
  
  return (
    <Form
      name="basic"
      labelCol={{span: 1}}
      wrapperCol={{span: 40}}
      initialValues={{remember: true}}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      autoComplete="off"
    >
      
      <Form.Item
        name="buySell"
        rules={[{
          required: true,
          message: 'Please define Buy/Sell, Call/Put, Quantity, and Days To Expiration (DTE).',
        }]}
      >
        <Space>
          <Radio.Group options={['Buy', 'Sell']} optionType="button" buttonStyle="solid" defaultValue="Sell" style={{border:'1,solid,red'}}/>
          <Radio.Group options={['Call', 'Put']} optionType="button" buttonStyle="solid" defaultValue="Put"/>
          <InputNumber min={1} max={100} addonAfter={'QTY'} style={{width: '100px'}} defaultValue={1}/>
          <InputNumber min={1} max={100} addonAfter={'DTE'} style={{width: '100px'}} defaultValue={1}/>
        </Space>
      </Form.Item>
      
    </Form>
  );
};
