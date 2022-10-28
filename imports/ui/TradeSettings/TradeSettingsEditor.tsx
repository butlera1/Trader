import {Meteor} from 'meteor/meteor';
import React from 'react';
import {Alert, Button, Form, Input, InputNumber, Select, Space, Switch, TimePicker} from 'antd';
import moment from 'moment';
import ITradeSettings, {DefaultTradeSettings} from '../../Interfaces/ITradeSettings';
import {StrategyLegEditor} from './StrategyLegEditor';
import './TradeSettings.css';

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
  const [isActive, setIsActive] = React.useState(tradeSettings?.isTrading);
  const [accountNumber, setAccountNumber] = React.useState(tradeSettings?.accountNumber);
  const [symbol, setSymbol] = React.useState(tradeSettings?.symbol);
  const [entryTime, setEntryTime] = React.useState(`${tradeSettings.entryHour}:${tradeSettings.entryMinute}`);
  const [exitTime, setExitTime] = React.useState(`${tradeSettings.exitHour}:${tradeSettings.exitMinute}`);
  const [percentGain, setPercentGain] = React.useState(tradeSettings?.percentGain);
  const [percentLoss, setPercentLoss] = React.useState(tradeSettings?.percentLoss);
  const [dte, setDTE] = React.useState(tradeSettings?.dte);
  const [quantity, setQuantity] = React.useState(tradeSettings?.quantity);
  const [errorText, setErrorText] = React.useState(null);
  const [saveHandle, setSaveHandle] = React.useState(null);

  const setMap = {
    isActive: setIsActive,
    accountNumber: setAccountNumber,
    symbol: setSymbol,
    entryTime: setEntryTime,
    exitTime: setExitTime,
    percentGain: setPercentGain,
    percentLoss, setPercentLoss,
  };
  
  const onChange = (name, value) => {
    console.log('Changing:', name, value);
    setMap[name](value);
    if (saveHandle) {
      Meteor.clearTimeout(saveHandle);
      setSaveHandle(null);
    }
    const tempHandle = Meteor.setTimeout(() => {
      setSaveHandle(null);
      console.log('Persisting changes');
      const strategy = {
        ...DefaultTradeSettings,
        isActive,
        accountNumber,
        symbol,
        entryTime,
        exitTime,
        percentGain,
        percentLoss,
        dte,
        quantity,
      };
      Meteor.call('SetUserStrategy', strategy, (error, result) => {
        if (error) {
          setErrorText(error.toString());
        }
      });
    }, 3000);
    setSaveHandle(tempHandle);
  };
  
  return (
    <Form
      name="basic"
      labelCol={{span: 6}}
      wrapperCol={{span: 8}}
      initialValues={{remember: true}}
      onChange={onChange}
      autoComplete="off"
    >
      <Form.Item
        label="Is Active"
        name="isActive"
        rules={[{required: true, message: 'True if trading this patter. False to turn it off.'}]}
        valuePropName="checked"
      >
        <Switch onChange={(value)=>onChange('isActive', value)} checked={isActive}/>
      </Form.Item>
      
      <Form.Item
        label="Account Number"
        name="accountNumber"
        rules={[{required: true, message: 'Please define the TDA account number to trade in.'}]}
      >
        <Input style={{width:200}}/>
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
        label="Quantity"
        name="quantity"
        rules={[{
          required: true,
          message: 'Please input the quantity options to trade.'
        }]}
      >
        <InputNumber min={0} max={200} style={{width: '100px'}}/>
      </Form.Item>
      
      <Form.Item
        label="Legs"
        name="buySell"
        rules={[{
          required: true,
          message: 'Please define Buy/Sell, Call/Put, Quantity, and Days To Expiration (DTE).',
        }]}
      >
        <StrategyLegEditor/>
      </Form.Item>
  
      {errorText ?
        <Alert
          message={errorText}
          type="warning"
          action={
            <Space>
              <Button size="small" type="ghost" onClick={() => setErrorText(null)}>
                Done
              </Button>
            </Space>
          }
          closable
        />
          : null
      }
    </Form>
  );
};