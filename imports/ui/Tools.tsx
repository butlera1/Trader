import React, {useEffect} from 'react';
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
        <label>VIX Total Ticks For Slope (3 sec./tick):</label>
        <InputNumber
          defaultValue={appSettings?.totalSlopeSamples}
          value={appSettings?.totalSlopeSamples}
          step={1}
          min={2}
          max={500}
          style={{width: '70px'}}
          onChange={(totalSlopeSamples: number) => onChange({...appSettings, totalSlopeSamples})}
        />
        <label>VIX Slope Samples to Average (must be less then Total Ticks):</label>
        <InputNumber
          defaultValue={appSettings?.slopeSamplesToAverage}
          value={appSettings?.slopeSamplesToAverage}
          step={1}
          min={2}
          max={500}
          style={{width: '70px'}}
          onChange={(slopeSamplesToAverage: number) => onChange({...appSettings, slopeSamplesToAverage})}
        />
        <label>Viewable completed trades:</label>
        <InputNumber
          defaultValue={appSettings?.maxPublishedTrades}
          value={appSettings?.maxPublishedTrades}
          step={1}
          min={1}
          max={10000}
          style={{width: '100px'}}
          onChange={(maxPublishedTrades: number) => onChange({...appSettings, maxPublishedTrades})}
        />
      </Space>
      <ShowErrorMessage/>
    </>
  );
}

export default Tools;