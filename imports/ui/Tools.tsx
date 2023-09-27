import React, {useEffect} from 'react';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
import _ from 'lodash';
import {Button, InputNumber, Space} from 'antd';
import {DefaultAppSettings, IAppSettings} from '../Interfaces/IAppSettings';

function Tools() {
  const [appSettings, setAppSettings] = React.useState<IAppSettings>({...DefaultAppSettings});
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const getOrders = () => {
    Meteor.call('GetOrders', null, '755541528', (error, result) => {
      if (error) {
        console.error(error);
      } else {
        console.log('Orders: ', result);
      }
    });
  };

  const getInitialSettings = () => {
    Meteor.call('GetAppSettings', (error, result) => {
      setErrorMessage('');
      if (error) {
        console.error(error);
        setErrorMessage(error.message);
      } else {
        setAppSettings({...result});
      }
    });
  };

  useEffect(getInitialSettings, []); // Call just once.

  const showOrdersButton = Meteor.user().username === 'Arch';

  const OrderButton = () => {
    if (showOrdersButton) {
      return <h2><Button onClick={getOrders} style={{marginBottom: 20, backgroundColor: 'pink'}}>Console LOG
        existing TDA orders.</Button></h2>;
    }
    return null;
  };

  const ShowErrorMessage = () => {
    if (!_.isEmpty(errorMessage)) {
      return <h2 style={{color: 'red'}}>{errorMessage}</h2>;
    }
    return null;
  };

  function onChange(value: IAppSettings) {
    setErrorMessage('');
    setAppSettings(value);
    Meteor.call('SetAppSettings', value, (error) => {
      if (error) {
        console.error(error);
        setErrorMessage(error.message);
      }
    });
  }

  return (
    <>
      <OrderButton/>
      <Space style={{marginLeft: 10}}>
        <h2>System Settings:</h2>
        <label>VWAP Sample Size:</label>
        <InputNumber
          defaultValue={appSettings?.vwapNumberOfSamples}
          value={appSettings?.vwapNumberOfSamples}
          step={1}
          min={2}
          max={500}
          style={{width: '80px'}}
          onChange={(vwapNumberOfSamples: number) => onChange({...appSettings, vwapNumberOfSamples})}
        />
        <label>VWAP Slope Samples Size:</label>
        <InputNumber
          defaultValue={appSettings?.vwapSlopeSamplesRequired}
          value={appSettings?.vwapSlopeSamplesRequired}
          step={1}
          min={2}
          max={500}
          style={{width: '80px'}}
          onChange={(vwapSlopeSamplesRequired: number) => onChange({...appSettings, vwapSlopeSamplesRequired})}
        />
      </Space>
      <ShowErrorMessage/>
    </>
  );
}

export default Tools;