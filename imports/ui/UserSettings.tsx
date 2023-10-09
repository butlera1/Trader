import React, {useEffect, useState} from 'react';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
import {Alert, Button, Checkbox, Input, InputNumber, Row, Space, Spin} from 'antd';
import {UserOutlined} from '@ant-design/icons';
import Constants from '../Constants';
import {CheckboxChangeEvent} from 'antd/lib/checkbox';
import IUserSettings from '../Interfaces/IUserSettings';

let timeoutHandle = null;

function UserSettings() {
  const [userSettings, setUserSettings]: [IUserSettings, any] = useState(null);
  const [errorText, setErrorText] = useState(null);
  const [getData, setGetData] = useState(false);

  function getLatestUserSettings() {
    Meteor.call('GetUserSettings', (error, userSettingsRecord) => {
      if (error) {
        alert(`Failed to get user settings. Error: ${error}`);
        return;
      }
      setUserSettings({...userSettingsRecord});
    });
  }

  const resetDaily = () => {
    Meteor.call('ResetUsersMaxDailyGainSettings', (error) => {
      if (error) {
        setErrorText(`Failed calling ResetUsersMaxDailyGainSettings: ${error.toString()}`);
      } else {
        console.log('ResetUsersMaxDailyGainSettings called successfully');
        setGetData(!getData);
      }
    });
  };

  useEffect(getLatestUserSettings, [getData]);

  const UsingPriceText = Constants.usingMarkPrice ? 'Mark' : 'Bid/Ask';

  const onChange = (propertyName, value) => {
    userSettings[propertyName] = value;
    setUserSettings({...userSettings}); // force update
    if (propertyName === 'accountIsActive' && value === false) {
      Meteor.call('EmergencyCloseAllTrades', (error) => {
        if (error) {
          setErrorText(`Failed calling EmergencyCloseAllTrades when account was deactivated: ${error.toString()}`);
        } else {
          setGetData(!getData);
        }
      });
    }

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
        } else {
          setErrorText(null);
        }
      });
    }, 1000);
  };

  const Warn = () => {
    if (userSettings?.accountIsActive === false) {
      return <Row style={{paddingBottom: 20}}>
        <h2 style={{color: 'red'}}>(Warning: Account is not active)</h2>
      </Row>;
    }
    return null;
  };

  const Note = () => {
    if (userSettings?.isMaxGainAllowedMet) {
      return <Row style={{paddingBottom: 20}}>
        <Space>
          <h2 style={{color: 'blue'}}>(Note: Max Daily Gain has been met so further trading is stopped for the
            day.)</h2>
          <Button type="primary" shape="round" onClick={resetDaily}>Reset Daily Gain Being Hit</Button>
        </Space>
      </Row>;
    }
    return null;
  };

  return (
    <>
      <Space>
        <span style={{fontSize: '32px', color: 'blue'}}>
          <UserOutlined/> {Meteor.user().username}
          <span
            style={{fontSize: '12px', color: 'grey'}}>  (Vr. {Constants.version}) Using {UsingPriceText} price.</span>
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
        <>
          <Row style={{paddingBottom: 20}}>
            <Space>
              <Checkbox
                onChange={(e: CheckboxChangeEvent) => onChange('accountIsActive', e.target.checked)}
                defaultChecked={userSettings.accountIsActive ?? false}
                checked={userSettings.accountIsActive ?? false}
              >
                Account is Active
              </Checkbox>
              <Input defaultValue={userSettings?.accountNumber} addonBefore={'Account #'}
                     onChange={(e) => onChange('accountNumber', e.target.value)}/>
              <Input defaultValue={userSettings.email} addonBefore={'Email'}
                     onChange={(e) => onChange('email', e.target.value)}/>
              <Input defaultValue={userSettings.phone} addonBefore={'Phone #'}
                     onChange={(e) => onChange('phone', e.target.value)}/>

              <InputNumber
                defaultValue={userSettings?.maxAllowedDailyLoss ?? 1000}
                addonBefore={'Max Allowed Daily Loss'}
                min={0}
                max={50000}
                step={1}
                style={{width: '270px'}}
                onChange={(value) => onChange('maxAllowedDailyLoss', value)}
              />
              <InputNumber
                defaultValue={userSettings?.maxAllowedDailyGain ?? 1000}
                addonBefore={'Max Allowed Daily Gain'}
                min={0}
                max={50000}
                step={1}
                style={{width: '270px'}}
                onChange={(value) => onChange('maxAllowedDailyGain', value)}
              />
            </Space>
          </Row>
          <Warn/>
          <Note/>
        </>
        :
        <Spin size="large"/>
      }
    </>
  );
}

export default UserSettings;