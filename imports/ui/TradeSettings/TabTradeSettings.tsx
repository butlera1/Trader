// @ts-ignore
import {Meteor} from 'meteor/meteor';
import React, {useEffect, useState} from 'react';
import {Alert, Button, Space, Tabs} from "antd";
import {TradeSettingsEditor} from "./TradeSettingsEditor";
import ITradeSettings from "../../Interfaces/ITradeSettings";

function createTabItem(tradeSettings: ITradeSettings, index: number) {
  return {
    label: `Strategy ${index}`,
    children: <TradeSettingsEditor tradeSettings={tradeSettings}/>,
    key: tradeSettings._id,
  };
}

function TabTradeSettings() {
  const [activeKey, setActiveKey] = useState(null);
  const [items, setItems] = useState([]);
  const [errorText, setErrorText] = useState(null);

  useEffect(() => {
    Meteor.call('GetAllUserTradeSettings', (error, tradeSettingsArray) => {
      if (error) {
        setErrorText(`Failed to get trading strategies. Error: ${error}`);
        return;
      }
      const items = tradeSettingsArray.map(createTabItem);
      setItems(items);
      if (items.length > 0) {
        setActiveKey(items[0].key);
      } else {
        setActiveKey(null);
      }
    });
  }, []);

  const onChange = (key: string) => {
    setActiveKey(key);
  };

  const add = () => {
    Meteor.call('GetNewUserTradeSettingsRecord', (error, settings) => {
      if (error) {
        setErrorText(`Failed to get new trading strategies. Error: ${error}`);
        return;
      }
      setItems([...items, createTabItem(settings, items.length)]);
      setActiveKey(settings._id);
    });
  };

  const remove = (targetKey: string) => {
    const targetIndex = items.findIndex(pane => pane.key === targetKey);
    const newPanes = items.filter(pane => pane.key !== targetKey);
    if (newPanes.length && targetKey === activeKey) {
      const {key} = newPanes[targetIndex === newPanes.length ? targetIndex - 1 : targetIndex];
      setActiveKey(key);
    }
    setItems(newPanes);
    Meteor.call('DeleteUserTradeSettingsRecord', targetKey);
  };

  const onEdit = (targetKey: string, action: 'add' | 'remove') => {
    if (action === 'add') {
      add();
    } else {
      remove(targetKey);
    }
  };

  return (
    <div>
      <div style={{marginBottom: 16}}>
        <Button type="primary" shape="round" onClick={add}>Add new strategy</Button>
      </div>
      <Tabs
        hideAdd
        onChange={onChange}
        activeKey={activeKey}
        type="editable-card"
        onEdit={onEdit}
        items={items}
        tabPosition={'left'}
        style={{width: 800, border: '1px solid grey', marginTop: -15}}
      />
      {errorText ? <Alert
          message={errorText}
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
}

export default TabTradeSettings;