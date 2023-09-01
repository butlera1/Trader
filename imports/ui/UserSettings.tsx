import React, {useState} from 'react';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
import {Alert, Button, Col, Input, Row, Space, Spin} from 'antd';
import {UserOutlined} from '@ant-design/icons';
import Constants from '../Constants';

let timeoutHandle = null;

function UserSettings({userSettings}) {
  const [errorText, setErrorText] = useState(null);
  const UsingPriceText = Constants.usingMarkPrice ? 'Mark' : 'Bid/Ask';

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
      Meteor.call('SaveUserSettings', userSettings, (error) => {
        if (error) {
          setErrorText(error.toString());
        }
      });
    }, 1000);
  };

  return (
    <>
      <Space>
        <span style={{fontSize: '32px', color: 'blue'}}>
          <UserOutlined/> {Meteor.user().username}
          <span style={{fontSize: '12px', color: 'grey'}}>  (Vr. {Constants.version}) Using {UsingPriceText} price.</span>
        </span>
        {errorText
          ?
          <Alert
            message={errorText}
            style={{marginBottom: 2}}
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
          null
        }
      </Space>
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