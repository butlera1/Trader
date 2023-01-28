import React from 'react';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
import {Button} from 'antd';

function Tools() {
  const getOrders = () => {
    Meteor.call('GetOrders', null, '755541528', (error, result) => {
      if (error) {
        console.error(error);
      } else {
        console.log('Orders: ', result);
      }
    });
  };
  const showTools = Meteor.user().username === 'Arch';
  if (showTools) return <Button onClick={getOrders} style={{marginBottom: 20, backgroundColor: 'pink'}}>Console LOG
    existing TDA orders.</Button>;
  return null;
}

export default Tools;