import {Meteor} from 'meteor/meteor';
import React, {useEffect} from 'react';
import {Alert, Button, Form, InputNumber, Select, Space, Switch, TimePicker} from 'antd';
import moment from 'moment';
import ITradeSettings from '../../Interfaces/ITradeSettings';
import './TradeSettings.css';
import {LegsEditor} from "./LegsEditor";

const disabledTime = () => {
  return {
    disabledHours: () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 16, 17, 18, 19, 20, 21, 22, 23],
    disabledMinutes: () => [],
    disabledSeconds: () => [],
  }
};

let timeoutHandle = null;

type Props = {
  tradeSettings: ITradeSettings,
}

export const TradeSettingsEditor = ({tradeSettings}: Props) => {
  const [isActive, setIsActive] = React.useState(tradeSettings.isActive);
  const [isMocked, setIsMocked] = React.useState(tradeSettings.isMocked);
  const [symbol, setSymbol] = React.useState(tradeSettings.symbol);
  const [entryHour, setEntryHour] = React.useState(tradeSettings.entryHour > 12 ? tradeSettings.entryHour - 12 : tradeSettings.entryHour);
  const [entryMinute, setEntryMinute] = React.useState(tradeSettings.entryMinute);
  const [entryAmPm, setEntryAmPm] = React.useState(tradeSettings.entryHour > 11 ? 'pm' : 'am');
  const [exitHour, setExitHour] = React.useState(tradeSettings.exitHour > 12 ? tradeSettings.exitHour - 12 : tradeSettings.exitHour);
  const [exitMinute, setExitMinute] = React.useState(tradeSettings.exitMinute);
  const [exitAmPm, setExitAmPm] = React.useState(tradeSettings.exitHour > 11 ? 'pm' : 'am');
  const [percentGain, setPercentGain] = React.useState(tradeSettings.percentGain);
  const [percentLoss, setPercentLoss] = React.useState(tradeSettings.percentLoss);
  const [dte, setDTE] = React.useState(tradeSettings.dte);
  const [quantity, setQuantity] = React.useState(tradeSettings.quantity);
  const [legs, setLegs] = React.useState(tradeSettings.legs);
  const [errorText, setErrorText] = React.useState(null);
  
  const setMap = {
    isActive: setIsActive,
    isMocked: setIsMocked,
    symbol: setSymbol,
    entryHour: setEntryHour,
    entryMinute: setEntryMinute,
    entryAmPm: setEntryAmPm,
    exitHour: setExitHour,
    exitMinute: setExitMinute,
    exitAmPm: setExitAmPm,
    percentGain: setPercentGain,
    percentLoss: setPercentLoss,
    dte: setDTE,
    quantity: setQuantity,
    legs: setLegs,
  };
  
  useEffect(() => {
    if (timeoutHandle) {
      Meteor.clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    timeoutHandle = Meteor.setTimeout(() => {
      Meteor.clearTimeout(timeoutHandle);
      timeoutHandle = null;
      const strategy = {
        _id: tradeSettings._id,
        isActive,
        isMocked,
        symbol,
        entryHour,
        entryMinute,
        exitHour,
        exitMinute,
        percentGain,
        percentLoss,
        dte,
        quantity,
        legs,
      };
      console.log(`Saving: `, strategy);
      Meteor.call('SetUserTradeSettings', strategy, (error, result) => {
        if (error) {
          setErrorText(error.toString());
        }
      });
    }, 2000);
  }, [isActive, isMocked, symbol, entryHour, entryMinute, exitHour, exitMinute, percentGain, percentLoss, dte, quantity, legs]);
  
  const onChange = (name, value) => {
    setMap[name](value);
  };
  
  return (
    <Form
      name="basic"
      labelCol={{span: 4}}
      wrapperCol={{span: 22}}
      initialValues={{remember: true}}
      autoComplete="off"
    >
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
      
      <Form.Item
        label="Is Active"
        name="isActive"
        valuePropName="checked"
      >
        <Switch
          onChange={(value) => onChange('isActive', value)}
          defaultValue={isActive}
          title={'True if trading this pattern. False to turn it off.'}
        />
      </Form.Item>
      
      <Form.Item
        label="Is Mocked"
        name="isMocked"
        valuePropName="checked"
      >
        <Switch
          onChange={(value) => onChange('isMocked', value)}
          defaultValue={isMocked}
          title={'True if mocking (fake trading) this pattern. False to turn off mocking.'}
        />
      </Form.Item>
      
      <Form.Item
        label="Symbol"
        name="symbol"
      >
        <Select defaultValue="QQQ" style={{width: 120}} onChange={(value) => onChange('symbol', value)}>
          <Select.Option value="QQQ">QQQ</Select.Option>
          <Select.Option value="SPY">SPY</Select.Option>
          <Select.Option value="SPX">SPX</Select.Option>
        </Select>
      </Form.Item>
      
      <Form.Item
        label="Entry Time (NY)"
        name="entryTime"
      >
        <TimePicker
          defaultValue={moment(`${entryHour}:${entryMinute} ${entryAmPm}`, 'h:mm a')}
          size="large"
          use12Hours
          format="h:mm a"
          disabledTime={disabledTime}
          style={{width: '120px'}}
          onChange={(value) => {
            onChange('entryHour', value.hour());
            onChange('entryMinute', value.minute());
            onChange('entryAmPm', value.hour()< 11 ? 'am' : 'pm');
          }
          }
        />
      </Form.Item>
      
      <Form.Item
        label="Exit Time (NY)"
        name="exitTime"
      >
        <TimePicker
          defaultValue={moment(`${exitHour}:${exitMinute} ${exitAmPm}`, 'h:mm a')}
          size="large"
          disabledTime={disabledTime}
          use12Hours
          format="h:mm a"
          style={{width: '120px'}}
          onChange={(value) => {
            onChange('exitHour', value.hour());
            onChange('exitMinute', value.minute());
            onChange('exitAmPm', value.hour()< 11 ? 'am' : 'pm');
          }
          }
        />
      </Form.Item>
      
      <Form.Item
        label="Percent Gain"
        name="percentGain"
      >
        <InputNumber
          min={0}
          max={100}
          addonAfter={'%'}
          style={{width: '100px'}}
          defaultValue={percentGain * 100}
          onChange={(value) => onChange('percentGain', (value) / 100)}
        />
      </Form.Item>
      
      <Form.Item
        label="Percent Loss"
        name="percentLoss"
      >
        <InputNumber
          min={0}
          max={400}
          addonAfter={'%'}
          style={{width: '100px'}}
          defaultValue={percentLoss * 100}
          onChange={(value) => onChange('percentLoss', (value) / 100)}
        />
      </Form.Item>
      
      <Form.Item
        label="DTE"
        name="dte"
      >
        <InputNumber
          min={0}
          max={100}
          addonAfter={'days'}
          style={{width: '100px'}}
          defaultValue={dte}
          onChange={(value) => onChange('dte', value)}
        />
      </Form.Item>
      
      <Form.Item
        label="Quantity"
        name="quantity"
      >
        <InputNumber
          defaultValue={quantity}
          min={1}
          max={200}
          style={{width: '100px'}}
          onChange={(value) => onChange('quantity', value)}/>
      </Form.Item>
      
      <Form.Item
        label="Legs"
        name="buySell"
      >
        <LegsEditor legs={legs} legsChangedCallback={setLegs}/>
      </Form.Item>
    </Form>
  );
};
