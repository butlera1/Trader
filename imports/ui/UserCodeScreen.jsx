import React, {useState} from 'react';

export const UserCodeScreen = () => {
  const [codeValue, setCodeValue] = useState(null);
  const [errorText, setErrorText] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

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
      if (error) {
        console.error(error);
      } else {
        if (result === null) {
          setAccessToken('Possible account issue (PW changed?).');
        } else {
          setAccessToken(result);
        }
      }
    });
  };

  const setCode = (event) => {
    setCodeValue(event.target.value);
  };

  return (
    <div>
      <label htmlFor="code">Enter code here: </label>
      <input type="text" id="code" name="code" autoFocus={true} placeholder={'Insert code here'} onChange={setCode}/>
      <button onClick={storeData} disabled={!codeValue}>Store Data</button>
      <p disabled={!errorText} style={{color: 'red'}}>{errorText}</p>
      <br/>
      <button onClick={getAccessToken}>Get Access Token</button>
      <p disabled={!accessToken}>Token is: {accessToken}</p>
      <br/>
    </div>
  );
};
