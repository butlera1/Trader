import {Meteor} from 'meteor/meteor';
import React from 'react';
import {useTracker} from 'meteor/react-meteor-data';
import {LoginForm} from './LoginForm';
import 'antd/dist/antd.css';
import {CodeOrMain} from './CodeOrMain';
import {Spin} from 'antd';

export const App = () => {

  const user = useTracker(() => Meteor.user(), [Meteor.users]);

  const GetView = () => {
    if (user === undefined) return (<Spin/>);
    if (user === null) return (<LoginForm/>);
    return (<CodeOrMain/>);
  };

  return (
    <div className="main">
      <GetView/>
    </div>
  );
};