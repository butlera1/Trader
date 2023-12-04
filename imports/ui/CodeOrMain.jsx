import {Meteor} from 'meteor/meteor';
import React from 'react';
import {MainScreen} from './MainScreen';
import 'antd/dist/antd.css';
import {UserCodeScreen} from './UserCodeScreen';
import {Alert, Button, Space, Spin} from 'antd';

export const CodeOrMain = () => {
  const [validatedUser, setValidatedUser] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    Meteor.call('GetAccessToken', (error, result) => {
      if (error) {
        setError(error);
        return;
      }
      if (result === null) {
        setValidatedUser(false);
      }else {
        setValidatedUser(result);
      }
    });
  }, []);

  const GetView = () => {
    if (validatedUser === null) {
      return (<Spin/>);
    }
    if (validatedUser) {
      return (<MainScreen/>);
    }
    return (<UserCodeScreen/>);
  };

  return (
    <div className="main">
      <GetView/>
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