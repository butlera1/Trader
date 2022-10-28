import * as ReactDOM from 'react-dom';
import React, {useState} from 'react';
import {TradeSettingsEditor} from './TradeSettings/TradeSettingsEditor';
import {DefaultTradeSettings} from '../Interfaces/ITradeSettings';

export const UserCodeScreen = () => {
  const [codeValue, setCodeValue] = useState(null);
  const [errorText, setErrorText] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [orders, setOrders] = useState(null);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const setAccessReturn = (error, result) => {
    if (error) {
      console.error(error);
      setErrorText(error.error);
    } else {
      console.log(`Set access information.`);
    }
  };

  const storeData = () => {
    setErrorText(null);
    Meteor.call('SetUserAccessInfo', codeValue, setAccessReturn);
  };

  const getAccessToken = () => {
    setAccessToken(null);
    Meteor.call('GetAccessToken', (error, result) => {
      if (error){
        console.error(error);
      }else {
        setAccessToken(result);
      }
    });
  };

  const setCode = (event) => {
    setCodeValue(event.target.value);
  };

  const getOrders = () => {
    setOrders(null);
    Meteor.call('GetOrders', null, '755541528', (error, result) => {
      if (error){
        console.error(error);
      }else {
        setOrders(result);
      }
    });
  };

  const TestMethod = () => {
    setOrderPlaced(false);
    // call with underLyingSymbol, desiredDelta, gainLimit, lossLimit
    Meteor.call('Test', (error, result) => {
      if (error){
        console.error(error);
      }else {
        setOrderPlaced(result.toString());
      }
    });
  };
  const TestMethod2 = () => {
    Meteor.call('GetNewUserTradeSettingsRecord', (error, result) => {
      if (error){
        console.error(error);
      } else {
        console.log('New TRADE SETTINGS: ', result);
      }
    });
  };
  const TestMethod3 = () => {
    Meteor.call('GetAllUserTradeSettings', (error, result) => {
      if (error){
        console.error(error);
      } else {
        console.log('ALL TRADE SETTINGS: ', result);
      }
    });
  };

  return (
    <div>
      <label htmlFor="code">Enter code here: </label>
      <input type="text" id="code" name="code" autoFocus={true} placeholder={'Insert code here'} onChange={setCode}/>
      <button onClick={storeData} disabled={!codeValue}>Store Data</button>
      <p disabled={!errorText} style={{color:'red'}}>{errorText}</p>
      <br/>
      <button onClick={getAccessToken}>Get Access Token</button>
      <p disabled={!accessToken}>Token is: {accessToken}</p>
      <br/>
      <button onClick={getOrders}>Show orders</button>
      <p disabled={!orders}>Orders are: {JSON.stringify(orders)}</p>
      <br/>
      <button onClick={TestMethod3}>Run GetAllUserTradeSettings</button>
      <button onClick={TestMethod2}>Run GetNewUserTradeSettings</button>
      <button onClick={TestMethod}>Run Test Method</button>
      {orderPlaced ? <p>Options: {orderPlaced}</p> : null}
    </div>
  );
};
