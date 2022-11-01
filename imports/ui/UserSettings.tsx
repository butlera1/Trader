import React, {useEffect, useState} from 'react';
import {Meteor} from "meteor/meteor";
import {Col, Input, Row, Space, Spin} from "antd";

let timeoutHandle = null;

function UserSettings({userSettings}) {
  const [errorText, setErrorText] = useState(null);
  
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
      <h2>{`User: ${Meteor.user().username}`}</h2>
      {userSettings ?
        <Row style={{paddingBottom:20}}>
          <Space>
            <Col><Input defaultValue={userSettings.accountNumber} addonBefore={'Account #'} onChange={(e) => onChange('accountNumber', e.target.value)}/></Col>
            <Col><Input defaultValue={userSettings.email} addonBefore={'Email'} onChange={(e) => onChange('email', e.target.value)}/></Col>
            <Col><Input defaultValue={userSettings.phone} addonBefore={'Phone #'} onChange={(e) => onChange('phone', e.target.value)}/></Col>
          </Space>
        </Row>
        :
        <Spin size="large" />
      }
    </>
  );
}

export default UserSettings;