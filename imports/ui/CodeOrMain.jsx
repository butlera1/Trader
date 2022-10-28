import {Meteor} from 'meteor/meteor';
import React from 'react';
import {useTracker} from 'meteor/react-meteor-data';
import {MainScreen} from './MainScreen';
import 'antd/dist/antd.css';
import {UserCodeScreen} from './UserCodeScreen';

export const CodeOrMain = () => {
  const [validatedUser, setValidatedUser] = React.useState(false);
  const [error, setError] = React.useState(null);

  Meteor.call('GetAccessToken', (error, result) => {
    if (error) {
      setError(error);
      return;
    }
    setValidatedUser(result);
  });

  return (
    <div className="main">
      {validatedUser ? <MainScreen/> : <UserCodeScreen/>}
      {error ? <Alert
          message={error.toString()}
          type="error"
          action={
            <Space>
              <Button size="small" type="ghost">
                Done
              </Button>
            </Space>
          }
          closable
        />
        : null}
    </div>
  );
};