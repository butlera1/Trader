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
import {diff} from 'deep-object-diff';
import {CheckboxChangeEvent} from 'antd/lib/checkbox';
import Rule1 from './Rules/Rule1';
import PrerunRule from './Rules/PrerunRule';
import Rule2 from './Rules/Rule2';
import {DefaultRule2Value} from '../../Interfaces/IRule2Value';

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
  const [commissionPerContract, setCommissionPerContract] = React.useState(tradeSettings.commissionPerContract || 0);
  const [legs, setLegs] = React.useState(tradeSettings.legs);
  const [errorText, setErrorText] = React.useState(null);
  const [tradeType, setTradeType] = React.useState(tradeSettings.tradeType ?? false);
  const [isRepeat, setIsRepeat] = React.useState(tradeSettings.isRepeat ?? false);
  const [useShortOnlyForLimits, setUseShortOnlyForLimits] = React.useState(tradeSettings.useShortOnlyForLimits ?? false);
  const [isRule1, setIsRule1] = React.useState(tradeSettings.isRule1 ?? true);
  const [isRule2, setIsRule2] = React.useState(tradeSettings.isRule2 ?? false);
  const [rule1Value, setRule1Value] = React.useState(tradeSettings.rule1Value ?? {});
  const [rule2Value, setRule2Value] = React.useState(tradeSettings.rule2Value ?? {...DefaultRule2Value});
  const [name, setName] = React.useState(tradeSettings.name ?? '');
  const [slope1Samples, setSlope1Samples] = React.useState(tradeSettings.slope1Samples ?? 0);
  const [slope2Samples, setSlope2Samples] = React.useState(tradeSettings.slope2Samples ?? 0);
  const [percentGainIsDollar, setPercentGainIsDollar] = React.useState(tradeSettings.percentGainIsDollar ?? false);
  const [percentLossIsDollar, setPercentLossIsDollar] = React.useState(tradeSettings.percentLossIsDollar ?? false);
  const [isPrerun, setIsPrerun] = React.useState(tradeSettings.isPrerun ?? true);
  const [prerunValue, setPrerunValue] = React.useState(tradeSettings.prerunValue ?? {});

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
    commissionPerContract: setCommissionPerContract,
    legs: setLegs,
    tradeType: setTradeType,
    isRepeat: setIsRepeat,
    useShortOnlyForLimits: setUseShortOnlyForLimits,
    isRule1: setIsRule1,
    isRule2: setIsRule2,
    isPrerun: setIsPrerun,
    prerunValue: setPrerunValue,
    rule1Value: setRule1Value,
    rule2Value: setRule2Value,
    name: setName,
    slope1Samples: setSlope1Samples,
    slope2Samples: setSlope2Samples,
    percentGainIsDollar: setPercentGainIsDollar,
    percentLossIsDollar: setPercentLossIsDollar,
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
        commissionPerContract,
        legs,
        tradeType,
        isRepeat,
        useShortOnlyForLimits,
        isRule1,
        isRule2,
        isPrerun,
        prerunValue,
        rule1Value,
        rule2Value,
        name,
        slope1Samples: slope1Samples,
        slope2Samples: slope2Samples,
        percentGainIsDollar: percentGainIsDollar,
        percentLossIsDollar: percentLossIsDollar,
      };
      strategy.description = GetDescription(strategy);
      const thereAreChanges = !_.isEmpty(diff(strategy, tradeSettings));
      if (thereAreChanges) {
        Meteor.call('SetUserTradeSettings', strategy, (error, result) => {
          if (error) {
            setErrorText(error.toString());
          } else {
            if (_.isFunction(changeCallback)) {
              changeCallback();
            }
          }
        });
      }
    }, 1000);
  }, [isActive, isMocked, symbol, days, entryHour, entryMinute, exitHour, exitMinute, percentGain,
    percentLoss, quantity, commissionPerContract, legs, tradeType, isRepeat, useShortOnlyForLimits,
    isRule1, isRule2, isPrerun, prerunValue, rule2Value, name, slope1Samples, slope2Samples, percentGainIsDollar,
    percentLossIsDollar]);

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
      <Row style={{margin: generalMargins}}>
        <Col>
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            defaultValue={name}
            placeholder="None"
            name="name"
            style={{marginLeft: 10}}
            onChange={(e) => onChange('name', e.target.value)}
          />
        </Col>
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
            <span>Slope1 Samples:</span>
            <InputNumber
              min={0}
              step="1"
              defaultValue={slope1Samples}
              max={100}
              style={{width: '80px'}}
              onChange={(value) => onChange('slope1Samples', value)}
            />
            <span style={{marginLeft: 50}}>Slope2 Samples:</span>
            <InputNumber
              min={0}
              step="1"
              defaultValue={slope2Samples}
              max={100}
              style={{width: '80px'}}
              onChange={(value) => onChange('slope2Samples', value)}
            />
          </Space>
        </Col>
      </Row>

      <Row style={{margin: generalMargins}}>
        <Col>
          <Space>
            <span>Gain:</span>
            <InputNumber
              min={0}
              step="0.01"
              defaultValue={Math.round(percentGain * 100000)/1000}
              max={1000}
              style={{width: '80px'}}
              onChange={(value) => onChange('percentGain', (value) / 100)}
            />
            <Select defaultValue={percentGainIsDollar} style={{width: 60}} onChange={(value) => onChange('percentGainIsDollar', value)}>
              <Select.Option value={false}>%</Select.Option>
              <Select.Option value={true}>$</Select.Option>
            </Select>

            <span style={{marginLeft: 50}}>Loss:</span>
            <InputNumber
              min={0}
              step="0.01"
              max={1000}
              defaultValue={Math.round(percentLoss * 100000)/1000}
              style={{width: '80px'}}
              onChange={(value) => onChange('percentLoss', (value) / 100)}
            />
            <Select defaultValue={percentLossIsDollar} style={{width: 60}} onChange={(value) => onChange('percentLossIsDollar', value)}>
              <Select.Option value={false}>%</Select.Option>
              <Select.Option value={true}>$</Select.Option>
            </Select>
          </Space>
        </Col>
      </Row>

      <Row style={{margin: generalMargins}}>
        <Space>
          <Col>
            <Space>
              <span>Fee Per Contract:</span>
              <InputNumber
                min={0}
                step="0.01"
                max={1}
                defaultValue={commissionPerContract}
                addonAfter={'$'}
                style={{width: '100px'}}
                onChange={(value) => onChange('commissionPerContract', value)}
              />
            </Space>
          </Col>
          <Col span={24}>
            <Checkbox
              style={{marginLeft: 50}}
              onChange={(e: CheckboxChangeEvent) => onChange('useShortOnlyForLimits', e.target.checked)}
              checked={useShortOnlyForLimits}
            >
              ShortsOnly for Gain Limit Calcs
            </Checkbox>
          </Col>
        </Space>
      </Row>
      <Row style={{margin: generalMargins}}>
        <Col span={24}>
          <Checkbox
            onChange={(e: CheckboxChangeEvent) => onChange('isPrerun', e.target.checked)}
            checked={isPrerun}
          >
          </Checkbox>
          <PrerunRule value={prerunValue} onChange={(value) => onChange('prerunValue', value)}/>
        </Col>
      </Row>
      <Row style={{margin: generalMargins}}>
        <Col span={24}>
          <Checkbox
            onChange={(e: CheckboxChangeEvent) => onChange('isRule1', e.target.checked)}
            checked={isRule1}
          >
          </Checkbox>
          <Rule1 value={rule1Value} onChange={(value) => onChange('rule1Value', value)}/>
        </Col>
      </Row>
      <Row style={{margin: generalMargins}}>
        <Col span={24}>
          <Checkbox
            onChange={(e: CheckboxChangeEvent) => onChange('isRule2', e.target.checked)}
            checked={isRule2}
          >
          </Checkbox>
          <Rule2 value={rule2Value} onChange={(value) => onChange('rule2Value', value)}/>
        </Col>
      </Row>

      <Row style={{margin: generalMargins}}>
        <Col span={8}>
          <span>Quantity:</span>
          <InputNumber
            defaultValue={quantity}
            min={1}
            max={200}
            style={{width: '50px'}}
            onChange={(value) => onChange('quantity', value)}/>
        </Col>
        <Col span={10}>
          <CheckboxGroup
            options={['IC', 'CS']}
            onChange={onChangeTradeType}
            value={tradeType}
          />
        </Col>
        <Col span={6}>
          <Checkbox
            onChange={(e: CheckboxChangeEvent) => onChange('isRepeat', e.target.checked)}
            checked={isRepeat}
          >
            Repeat Trade
          </Checkbox>
        </Col>
      </Row>
      <div style={{margin: generalMargins}}>
        <LegsEditor legs={legs} legsChangedCallback={setLegs} disableDelete={tradeType.length > 0}/>
      </div>
    </>
  );
};
