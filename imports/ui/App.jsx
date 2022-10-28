import {Meteor} from 'meteor/meteor';
import React from 'react';
import {useTracker} from 'meteor/react-meteor-data';
import {LoginForm} from './LoginForm';
import {MainScreen} from './MainScreen';
import 'antd/dist/antd.css';

export const App = () => {
  const user = useTracker(() => Meteor.user());

  return (
    <div className="main">
      {user ? <MainScreen/> : <LoginForm/>}
    </div>
  );
};