import React, {useState} from 'react';
import {Meteor} from 'meteor/meteor';
import {Alert, Button, Popconfirm, Space} from 'antd';
import {QuestionCircleOutlined} from '@ant-design/icons';


function EmergencyCloseActiveTrades() {
  const [errorText, setErrorText] = useState(null);
  const onEmergencyClick = () => {
    Meteor.call('EmergencyCloseAllTrades', (error, result) => {
      if (error) {
        setErrorText(`Failed calling EmergencyCloseAllTrades: ${error.toString()}`);
      }
    });
  };

  return (
    <Space>
      <Popconfirm
        title="Are you sure: CLOSE ALL TRADES?"
        icon={<QuestionCircleOutlined style={{color: 'red'}}/>}
        onConfirm={onEmergencyClick}
        okText="Yes"
        cancelText="No"
      >
        <Button
          style={{marginLeft: 50, float: 'right'}}
          type="primary"
          shape="round"
          size={'large'}
          danger
        >
          Emergency: Close All Trades
        </Button>
      </Popconfirm>
      {errorText
        ?
        <Alert
          message={errorText}
          style={{marginBottom: 2}}
          type="error"
          action={
            <Space>
              <Button size="small" type="ghost" onClick={() => setErrorText(null)}>
                Done
              </Button>
            </Space>
          }
          closable
        />
        :
        null
      }
    </Space>
  );
}

export default EmergencyCloseActiveTrades;