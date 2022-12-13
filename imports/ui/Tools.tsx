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
  return <Button onClick={getOrders} style={{marginBottom: 2}}>Orders</Button>;
}

export default Tools;