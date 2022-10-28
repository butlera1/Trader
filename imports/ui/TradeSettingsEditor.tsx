import React from 'react';
import {Button, Form, Input, InputNumber, Radio, Select, Space, Switch, TimePicker} from 'antd';
import moment from 'moment';
import ITradeSettings from '../Interfaces/ITradeSettings';
import {StrategyEditorForm} from "./StrategyEditorForm";

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
export const TradeSettingsEditor = ({tradeSettings}: Props) => {
  const onFinish = (values) => {
    console.log('Success:', values);
  };
  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };
  
  return (
    <Form
      name="basic"
      labelCol={{span: 6}}
      wrapperCol={{span: 8}}
      initialValues={{remember: true}}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      autoComplete="off"
    >
      <Form.Item
        label="Is Active"
        name="isTrading"
        rules={[{required: true, message: 'True if trading this patter. False to turn it off.'}]}
        valuePropName="checked"
      >
        <Switch/>
      </Form.Item>
      
      <Form.Item
        label="Account Number"
        name="accountNumber"
        rules={[{required: true, message: 'Please define the TDA account number to trade in.'}]}
      >
        <Input/>
      </Form.Item>
      
      <Form.Item
        label="Symbol"
        name="symbol"
        rules={[{required: true, message: 'Please define the TDA account number to trade in.'}]}
      >
        <Select defaultValue="QQQ" style={{width: 120}}>
          <Select.Option value="QQQ">QQQ</Select.Option>
          <Select.Option value="SPY">SPY</Select.Option>
          <Select.Option value="SPX">SPX</Select.Option>
        </Select>
      </Form.Item>
      
      <Form.Item
        label="Trade Entry Time (NY)"
        name="entryTime"
        rules={[{required: true, message: 'Please define the entry time for the trade.'}]}
      >
        <TimePicker
          initialValue={moment('12:03', 'HH:mm')}
          size="large"
          format="HH:mm"
          disabledTime={disabledTime}
          style={{width: '100px'}}
        />
      </Form.Item>
      
      <Form.Item
        label="Trade Exit Time (NY)"
        name="exitTime"
        rules={[{required: true, message: 'Please define the entry time for the trade.'}]}
      >
        <TimePicker
          initialValue={moment('12:03', 'HH:mm')}
          size="large"
          format="HH:mm"
          style={{width: '100px'}}
        />
      </Form.Item>
      
      <Form.Item
        label="Percent Gain"
        name="percentGain"
        rules={[{
          required: true,
          message: 'Please input the desired percent gain (0-100 where zero means no gain limit).'
        }]}
      >
        <InputNumber min={0} max={100} addonAfter={'%'} style={{width: '100px'}}/>
      </Form.Item>
      
      <Form.Item
        label="Percent Loss"
        name="percentLoss"
        rules={[{
          required: true,
          message: 'Please input the desired percent loss (0-300 where zero means no loss limit).'
        }]}
      >
        <InputNumber min={0} max={400} addonAfter={'%'} style={{width: '100px'}}/>
      </Form.Item>
      
      <Form.Item
        label="DTE"
        name="dte"
        rules={[{
          required: true,
          message: 'Please input the desired percent gain (0-100 where zero means no gain limit).'
        }]}
      >
        <InputNumber min={0} max={100} addonAfter={'days'} style={{width: '100px'}}/>
      </Form.Item>
      
      <Form.Item
        label="Strategy"
        name="buySell"
        rules={[{
          required: true,
          message: 'Please define Buy/Sell, Call/Put, Quantity, and Days To Expiration (DTE).',
        }]}
      >
        <StrategyEditorForm  />
      </Form.Item>
      
      
      <Form.Item wrapperCol={{offset: 6, span: 8}}>
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
};
