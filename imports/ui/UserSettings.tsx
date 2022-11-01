import React, {useState} from 'react';
import {Meteor} from "meteor/meteor";
import {Alert, Button, Col, Input, Popconfirm, Row, Space, Spin} from "antd";
import { QuestionCircleOutlined } from '@ant-design/icons';

let timeoutHandle = null;

function UserSettings({userSettings}) {
  const [errorText, setErrorText] = useState(null);
  
  const onEmergencyClick = () => {
    Meteor.call('EmergencyCloseAllTrades', (error, result) => {
      if (error) {
        setErrorText(`Failed calling EmergencyCloseAllTrades: ${error.toString()}`);
      }
    })
  };
  
  const onChange = (propertyName, value) => {
    // setMap[propertyName](value);
    userSettings[propertyName] = value;
    if (timeoutHandle) {
      Meteor.clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    timeoutHandle = Meteor.setTimeout(() => {
      Meteor.clearTimeout(timeoutHandle);
      timeoutHandle = null;
      console.log('Persisting changes');
      Meteor.call('SaveUserSettings', userSettings, (error, result) => {
        if (error) {
          setErrorText(error.toString());
        }
      });
    }, 3000);
    
  };
  
  return (
    <>
      <h2>
        <span style={{fontWeight:'normal', color:'blue'}}>User: </span>{Meteor.user().username}
        <Popconfirm
          title="Are you sure: CLOSE ALL TRADES?"
          icon={<QuestionCircleOutlined style={{color: 'red'}}/>}
          onConfirm={onEmergencyClick}
          okText="Yes"
          cancelText="No"
        >
          <Button
            style={{marginLeft: 50}}
            type="primary"
            shape="round"
            size={'large'}
            danger
          >
            Emergency: Close All Trades
          </Button>
        </Popconfirm>
        <span style={{fontWeight:'normal', fontSize:15, color:'blue', position:'fixed', top:0, right:10}}>Version: 0.1</span>
      </h2>
      {errorText
        ?
        <Alert
          message={errorText}
          style={{marginBottom:2}}
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
        <div><br/><br/></div>
      }
      {userSettings ?
        <Row style={{paddingBottom: 20}}>
          <Space>
            <Col><Input defaultValue={userSettings.accountNumber} addonBefore={'Account #'}
                        onChange={(e) => onChange('accountNumber', e.target.value)}/></Col>
            <Col><Input defaultValue={userSettings.email} addonBefore={'Email'}
                        onChange={(e) => onChange('email', e.target.value)}/></Col>
            <Col><Input defaultValue={userSettings.phone} addonBefore={'Phone #'}
                        onChange={(e) => onChange('phone', e.target.value)}/></Col>
          </Space>
        </Row>
        :
        <Spin size="large"/>
      }
    </>
  );
}

export default UserSettings;