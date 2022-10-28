import {Meteor} from 'meteor/meteor';
import React from 'react';
import {useTracker} from 'meteor/react-meteor-data';
import {LoginForm} from './LoginForm';
import 'antd/dist/antd.css';
import {CodeOrMain} from './CodeOrMain';

export const App = () => {
  const user = useTracker(() => Meteor.user());

  return (
    <div className="main">
      {user ? <CodeOrMain/> : <LoginForm/>}
    </div>
  );
};