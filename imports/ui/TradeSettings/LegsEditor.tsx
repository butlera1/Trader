// @ts-ignore
import {Meteor} from 'meteor/meteor';
import React, {useState} from 'react';
import {Alert, Button, Col, InputNumber, Row, Select, Space} from 'antd';
import ILegSettings, {BuySell, DefaultLegSettings, OptionType} from '../../Interfaces/ILegSettings';
import {DeleteOutlined} from '@ant-design/icons';


export const LegsEditor = ({legs, legsChangedCallback}: { legs: ILegSettings[], legsChangedCallback: any }) => {
  const [errorText, setErrorText] = useState(null);
  
  let timerHandle = null;
  
  const saveSettings = () => {
    if (timerHandle){
      Meteor.clearTimeout(timerHandle);
      timerHandle = null;
    }
    timerHandle = Meteor.setTimeout(()=>legsChangedCallback([...legs]), 3000);
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
      const marginLeft = (type === OptionType.PUT) ? 25 : 15;
      return (
          <Row key={`leg${index}`} style={{marginTop:5, marginLeft}}>
            <Col span={4}>
              <Select
                defaultValue={leg.buySell}
                style={{width: 70}}
                onChange={(value) => onChange('buySell', index, value)}>
                <Select.Option value={BuySell.BUY}>Buy</Select.Option>
                <Select.Option value={BuySell.SELL}>Sell</Select.Option>
              </Select>
            </Col>
            <Col span={4} offset={4}>
              <InputNumber
                min={0}
                max={100}
                addonAfter={'\u0394'}
                style={{width:90}}
                defaultValue={Math.trunc(leg.delta * 100)}
                onChange={(value) => onChange('delta', index, value/100)}
              />
            </Col>
            <Col span={1} offset={5}>
              <Button
                type={'text'}
                size={'small'}
                onClick={() => onDeleteLeg(index)}
                style={{marginTop:4}}
                danger
              >
                <DeleteOutlined/>
              </Button>
            </Col>
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
              <Button size={'small'} style={{background: 'green', color: 'white', marginRight: 10}}
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
              <Button size="small" style={{background: 'red', color: 'white', marginLeft: 10}}
                      onClick={onClickPutsAdd}> +</Button></center>
          </div>
          <GetUILegs type={OptionType.PUT}/>
        </Col>
      </Row>
    </div>
  );
};
