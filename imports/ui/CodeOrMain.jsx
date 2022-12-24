import {Meteor} from 'meteor/meteor';
import React from 'react';
import {useTracker} from 'meteor/react-meteor-data';
import {MainScreen} from './MainScreen';
import 'antd/dist/antd.css';
import {UserCodeScreen} from './UserCodeScreen';
import {Spin} from 'antd';

export const CodeOrMain = () => {
  const [validatedUser, setValidatedUser] = React.useState(null);
  const [error, setError] = React.useState(null);

  Meteor.call('GetAccessToken', (error, result) => {
    if (error) {
      setError(error);
      return;
    }
    setValidatedUser(result);
  });
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