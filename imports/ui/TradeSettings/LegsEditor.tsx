// @ts-ignore
import {Meteor} from 'meteor/meteor';
import React, {useState} from 'react';
import {Alert, Button, Col, InputNumber, Row, Select, Space} from 'antd';
import ILegSettings, {BuySell, DefaultLegSettings, OptionType} from '../../Interfaces/ILegSettings';
import {DeleteOutlined} from '@ant-design/icons';


export const LegsEditor = ({
                             legs,
                             legsChangedCallback,
                             disableDelete
                           }: { legs: ILegSettings[], legsChangedCallback: any, disableDelete: boolean }) => {
  const [errorText, setErrorText] = useState(null);

  let timerHandle = null;

  const saveSettings = () => {
    Meteor.clearTimeout(timerHandle);
    timerHandle = Meteor.setTimeout(() => legsChangedCallback([...legs]), 2000);
  };

  const GetUILegs = ({type}: { type: string }) => {
    const onDeleteLeg = (index) => {
      legs.splice(index, 1); // Remove one element
      legsChangedCallback([...legs]);
    };

    const onChange = (name, index, value) => {
      legs[index][name] = value;
      saveSettings();
    };

    const results = legs.map((leg, index) => {
      if (leg.callPut !== type) {
        return null;
      }
      const marginLeft = (type === OptionType.PUT) ? 15 : 0;
      return (
        <Row key={`leg${index}`} style={{marginTop: 5, marginLeft}}>
          <Space>
            <InputNumber
              min={1}
              max={1000}
              addonAfter={'Qty'}
              style={{width: 105}}
              defaultValue={leg.quantity}
              onChange={(value) => onChange('quantity', index, value)}
            />

            <Select
              defaultValue={leg.buySell}
              style={{width: 70}}
              onChange={(value) => onChange('buySell', index, value)}>
              <Select.Option value={BuySell.BUY}>Buy</Select.Option>
              <Select.Option value={BuySell.SELL}>Sell</Select.Option>
            </Select>
            <InputNumber
              min={0}
              max={100}
              addonAfter={'\u0394'}
              style={{width: 85}}
              defaultValue={Math.trunc(leg.delta * 100)}
              onChange={(value) => onChange('delta', index, value / 100)}
            />
            <InputNumber
              min={0}
              max={100}
              defaultValue={leg.dte ?? 0}
              addonAfter={'DTE'}
              style={{width: 100}}
              onChange={(value) => onChange('dte', index, value)}
            />
            <Button
              disabled={disableDelete}
              type={'text'}
              size={'small'}
              onClick={() => onDeleteLeg(index)}
              style={{marginTop: 4, marginLeft: -15}}
              danger
            >
              <DeleteOutlined/>
            </Button>
          </Space>
        </Row>
      );
    });
    return results;
  };

  const onClickCallsAdd = () => {
    legs.push({...DefaultLegSettings, callPut: OptionType.CALL});
    legsChangedCallback([...legs]);
  };

  const onClickPutsAdd = () => {
    legs.push({...DefaultLegSettings, callPut: OptionType.PUT});
    legsChangedCallback([...legs]);
  };

  return (
    <div>
      {errorText
        ?
        <Alert
          message={errorText}
          type="error"
          action={
            <Space>
              <Button size="small" type="ghost" onClick={() => setErrorText(null)}>
                Done
              </Button>
            </Space>
          }
          closable
        />
        :
        null}
      <Row>
        <Col span={12}>
          <div style={{background: 'green', color: 'white', marginRight: 10}}>
            <center>
              <Button
                disabled={disableDelete}
                size={'small'}
                style={{background: disableDelete ? 'gray' : 'green', color: 'white', marginRight: 10}}
                onClick={onClickCallsAdd}> +</Button>
              CALLS
            </center>
          </div>
          <GetUILegs type={OptionType.CALL}/>
        </Col>
        <Col span={12}>
          <div style={{background: 'red', color: 'white', marginLeft: 10}}>
            <center>
              PUTS
              <Button disabled={disableDelete} size="small"
                      style={{background: disableDelete ? 'gray' : 'red', color: 'white', marginLeft: 10}}
                      onClick={onClickPutsAdd}> +</Button></center>
          </div>
          <GetUILegs type={OptionType.PUT}/>
        </Col>
      </Row>
    </div>
  );
};
