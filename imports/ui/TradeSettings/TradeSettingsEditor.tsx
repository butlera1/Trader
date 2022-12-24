// @ts-ignore
import {Meteor} from 'meteor/meteor';
import React, {useEffect} from 'react';
import {Alert, Button, Checkbox, Col, InputNumber, Popconfirm, Row, Select, Space, Switch, TimePicker} from 'antd';
import moment from 'moment';
import ITradeSettings, {
  DefaultCalendarSpreadLegsSettings,
  DefaultIronCondorLegsSettings,
  GetDescription
} from '../../Interfaces/ITradeSettings';
import './TradeSettings.css';
import {LegsEditor} from './LegsEditor';
import {QuestionCircleOutlined} from '@ant-design/icons';
import _ from 'lodash';

const CheckboxGroup = Checkbox.Group;
const generalMargins = 30;

let timeoutHandle = null;

type Props = {
  tradeSettings: ITradeSettings,
  changeCallback: any,
}

export const TradeSettingsEditor = ({tradeSettings, changeCallback}: Props) => {
  const [isActive, setIsActive] = React.useState(tradeSettings.isActive);
  const [isMocked, setIsMocked] = React.useState(tradeSettings.isMocked);
  const [symbol, setSymbol] = React.useState(tradeSettings.symbol);
  const [days, setDays] = React.useState(tradeSettings.days);
  const [entryHour, setEntryHour] = React.useState(tradeSettings.entryHour);
  const [entryMinute, setEntryMinute] = React.useState(tradeSettings.entryMinute);
  const [entryAmPm, setEntryAmPm] = React.useState(tradeSettings.entryHour > 11 ? 'pm' : 'am');
  const [exitHour, setExitHour] = React.useState(tradeSettings.exitHour);
  const [exitMinute, setExitMinute] = React.useState(tradeSettings.exitMinute);
  const [exitAmPm, setExitAmPm] = React.useState(tradeSettings.exitHour > 11 ? 'pm' : 'am');
  const [percentGain, setPercentGain] = React.useState(tradeSettings.percentGain);
  const [percentLoss, setPercentLoss] = React.useState(tradeSettings.percentLoss);
  const [quantity, setQuantity] = React.useState(tradeSettings.quantity);
  const [legs, setLegs] = React.useState(tradeSettings.legs);
  const [errorText, setErrorText] = React.useState(null);
  const [tradeType, setTradeType] = React.useState(tradeSettings.tradeType || false);

  const setMap = {
    isActive: setIsActive,
    isMocked: setIsMocked,
    symbol: setSymbol,
    days: setDays,
    entryHour: setEntryHour,
    entryMinute: setEntryMinute,
    entryAmPm: setEntryAmPm,
    exitHour: setExitHour,
    exitMinute: setExitMinute,
    exitAmPm: setExitAmPm,
    percentGain: setPercentGain,
    percentLoss: setPercentLoss,
    quantity: setQuantity,
    legs: setLegs,
    tradeType: setTradeType,
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
        ...tradeSettings,
        isActive,
        isMocked,
        symbol,
        days,
        entryHour,
        entryMinute,
        exitHour,
        exitMinute,
        percentGain,
        percentLoss,
        quantity,
        legs,
        tradeType,
      };
      strategy.description = GetDescription(strategy);
      Meteor.call('SetUserTradeSettings', strategy, (error, result) => {
        if (error) {
          setErrorText(error.toString());
        } else {
          if (_.isFunction(changeCallback)) {
            changeCallback();
          }
        }
      });
    }, 1000);
  }, [isActive, isMocked, symbol, days, entryHour, entryMinute, exitHour, exitMinute, percentGain, percentLoss, quantity, legs, tradeType]);

  const RunNow = () => {
    return (
      <Space style={{marginLeft: 10}}>
        <Popconfirm
          title="Are you sure: Run this trade now?"
          icon={<QuestionCircleOutlined style={{color: 'red'}}/>}
          onConfirm={testRun}
          okText="Yes"
          cancelText="No"
        >
          <Button
            style={{marginTop: 5, marginRight: -20, marginBottom: -20, backgroundColor: 'lightgreen', color: 'black'}}
            type="primary"
            shape="round"
          >
            Run Now
          </Button>
        </Popconfirm>
      </Space>
    );
  };

  const onChangeTradeType = (value) => {
    if (value.length > 1) {
      value.splice(value.indexOf(tradeType[0]), 1);
      if (value[0] === 'IC') {
        // Special case for Iron Condor
        setLegs([...DefaultIronCondorLegsSettings]);
      }
      if (value[0] === 'CS') {
        // Special case for Calendar Spread
        setLegs([...DefaultCalendarSpreadLegsSettings]);
      }
    }
    setTradeType(value);
  };

  const onChange = (name, value) => {
    setMap[name](value);
  };

  const testRun = () => {
    Meteor.call('TestStrategy', tradeSettings._id, (error) => {
      if (error) {
        setErrorText(`Problem in testRun: ${error.toString()}`);
      }
    });
  };

  return (
    <>
      <Row style={{margin: 0}}>
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
      </Row>
      <Row style={{margin: generalMargins, marginTop: 20}}>
        <Col span={6}>
          <Space>
            <span>Is Active:</span>
            <Switch
              defaultChecked={isActive}
              onChange={(value) => onChange('isActive', value)}
              title={'True if trading this pattern. False to turn it off.'}
            />
          </Space>
        </Col>
        <Col span={6}>
          <Space>
            <span>Is Mocked:</span>
            <Switch
              defaultChecked={isMocked}
              onChange={(value) => onChange('isMocked', value)}
              title={'True if mocking (fake trading) this pattern. False to turn off mocking.'}
            />
          </Space>
        </Col>
        <Col span={6}>
          <Space>
            <span>Symbol:</span>
            <Select defaultValue={symbol} style={{width: 120}} onChange={(value) => onChange('symbol', value)}>
              <Select.Option value="QQQ">QQQ</Select.Option>
              <Select.Option value="SPY">SPY</Select.Option>
              <Select.Option value="$SPX.X">SPX</Select.Option>
              <Select.Option value="$VIX.X">VIX</Select.Option>
            </Select>
            <RunNow/>
          </Space>
        </Col>
      </Row>
      <Row style={{margin: generalMargins}}>
        <Col>
          <Space>
            <span>Days:</span>
            <CheckboxGroup
              options={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']}
              onChange={(value) => onChange('days', value)}
              value={days}
            />
          </Space>
        </Col>
      </Row>
      <Row style={{margin: generalMargins}}>
        <Col span={24}>
          <Space>
            <span>Entry Time (NY):</span>
            <TimePicker
              size="large"
              use12Hours
              format="h:mm a"
              style={{width: '120px'}}
              defaultValue={moment(`${entryHour}:${entryMinute} ${entryAmPm}`, 'h:mm a')}
              onChange={(value) => {
                onChange('entryHour', value.hour());
                onChange('entryMinute', value.minute());
                onChange('entryAmPm', value.hour() < 11 ? 'am' : 'pm');
              }
              }
            />
            <span style={{marginLeft: 50}}>Exit Time (NY):</span>
            <TimePicker
              size="large"
              use12Hours
              format="h:mm a"
              style={{width: '120px'}}
              defaultValue={moment(`${exitHour}:${exitMinute} ${exitAmPm}`, 'h:mm a')}
              onChange={(value) => {
                onChange('exitHour', value.hour());
                onChange('exitMinute', value.minute());
                onChange('exitAmPm', value.hour() < 11 ? 'am' : 'pm');
              }
              }
            />
          </Space>
        </Col>
      </Row>

      <Row style={{margin: generalMargins}}>
        <Col>
          <Space>
            <span>Percent Gain:</span>
            <InputNumber
              min={0}
              defaultValue={Math.trunc(percentGain * 100)}
              max={100}
              addonAfter={'%'}
              style={{width: '100px'}}
              onChange={(value) => onChange('percentGain', (value) / 100)}
            />
            <span style={{marginLeft: 50}}>Percent Loss:</span>
            <InputNumber
              min={0}
              max={400}
              defaultValue={Math.trunc(percentLoss * 100)}
              addonAfter={'%'}
              style={{width: '100px'}}
              onChange={(value) => onChange('percentLoss', (value) / 100)}
            />
          </Space>
        </Col>
      </Row>

      <Row style={{margin: generalMargins}}>
        <Col span={6}>
          <span>Quantity:</span>
          <InputNumber
            defaultValue={quantity}
            min={1}
            max={200}
            style={{width: '50px'}}
            onChange={(value) => onChange('quantity', value)}/>
        </Col>
        <Col span={6}>
          <CheckboxGroup
            options={['IC', 'CS']}
            onChange={onChangeTradeType}
            value={tradeType}
          />
        </Col>
      </Row>
      <div style={{margin: generalMargins}}>
        <LegsEditor legs={legs} legsChangedCallback={setLegs} disableDelete={tradeType.length > 0}/>
      </div>
    </>
  );
};
