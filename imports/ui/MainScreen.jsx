import * as ReactDOM from 'react-dom';
import React, {useState} from 'react';

export const MainScreen = () => {
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
        setOrders(result?.securitiesAccount?.orderStrategies);
      }
    });
  };

  const placeTestOrder = () => {
    setOrderPlaced(false);
    // call with underLyingSymbol, desiredDelta, gainLimit, lossLimit
    Meteor.call('PlaceModeledTrade', (error, result) => {
      if (error){
        console.error(error);
      }else {
        setOrderPlaced(result.toString());
      }
    });
  };

  return (
    <div>
      <label htmlFor="code">Enter code here: </label>
      <input type="text" id="code" name="code" autoFocus={true} placeholder={'Insert code here'} onChange={setCode}/>
      <br/>
      <br/>
      <button onClick={storeData} disabled={!codeValue}>Store Data</button>
      <p disabled={!errorText} style={{color:'red'}}>{errorText}</p>
      <br/>
      <br/>
      <button onClick={getAccessToken}>Get Access Token</button>
      <p disabled={!accessToken}>Token is: {accessToken}</p>
      <br/>
      <br/>
      <button onClick={getOrders}>Show orders</button>
      <p disabled={!orders}>Orders are: {JSON.stringify(orders)}</p>
      <br/>
      <br/>
      <button onClick={placeTestOrder}>Place an order</button>
      {orderPlaced ? <p>Options: {orderPlaced}</p> : null}

    </div>
  );
};
