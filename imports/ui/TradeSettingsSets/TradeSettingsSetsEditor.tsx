import {Meteor} from 'meteor/meteor';
import {useTracker} from 'meteor/react-meteor-data';
import React, {useState} from 'react';
import TradeSettingsSets from '../../Collections/TradeSettingsSets';
import ITradeSettingsSet, {DefaultTradeSettingsSets} from "../../Interfaces/ITradeSettingsSet";
import TabTradeSettings from "../TradeSettings/TabTradeSettings";
import {Button, Input, Modal, Popconfirm, Select, Space} from "antd";
import {DeleteOutlined, QuestionCircleOutlined} from "@ant-design/icons";


function getName(set: ITradeSettingsSet) {
  return `${set.name || 'No name'}${set.isDefault ? ' *' : ''}`
}

function getDefaultSet() {
  const tempSetArray = TradeSettingsSets.find().fetch();
  return tempSetArray.find((set:ITradeSettingsSet) => set.isDefault) || tempSetArray[0];
}

export default function TradeSettingsSetsEditor() {
  const sets: ITradeSettingsSet[] = useTracker(() => TradeSettingsSets.find().fetch(), [TradeSettingsSets]);
  const [selectedSet, setSelectedSet] = React.useState(getDefaultSet());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSetName, setEditSetName] = useState('');


  const showEditNameModal = () => {
    setEditSetName(selectedSet.name);
    setIsModalOpen(true);
  };

  const handleEditNameOk = () => {
    setSelectedSet(null);
    setIsModalOpen(false);
    TradeSettingsSets.update(selectedSet._id, {$set: {name: editSetName}});
    selectedSet.name = editSetName;
    setSelectedSet(selectedSet); // Force re-render of select component.
  };

  const handleEditNameCancel = () => {
    setIsModalOpen(false);
  };
  const add = () => {
    const id = TradeSettingsSets.insert({...DefaultTradeSettingsSets, userId: Meteor.userId(), name: `New Set ${new Date().toLocaleString()}`});
    setSelectedSet(TradeSettingsSets.findOne(id));
  };

  const deleteSet = () => {
    TradeSettingsSets.remove(selectedSet._id);
    setSelectedSet(getDefaultSet());
  };

  const setDefault = () => {
    const currentDefaultId = sets.find(set => set.isDefault)?._id;
    if (currentDefaultId !== selectedSet._id) {
      setSelectedSet(null);
      TradeSettingsSets.update(currentDefaultId, {$set: {isDefault: false}});
      TradeSettingsSets.update(selectedSet._id, {$set: {isDefault: true}});
      setSelectedSet(selectedSet); // Force refresh.
    }
  };

  return (
    <div style={{width: 1300, border: '1px solid grey', marginTop: 15, padding: 10}}>
      <Space style={{marginBottom: 30}}>
        <h2 style={{marginBottom: 0}}>Trade Pattern Set:</h2>
        <Select
          style={{width: 600}}
          onChange={(id) => setSelectedSet(sets.find((record) => record._id === id))}
          defaultValue={selectedSet?._id}
          value={selectedSet?._id}
        >
          {sets.map((record) => <Select.Option key={record._id} value={record._id}>{getName(record)}</Select.Option>)}
        </Select>
        <Button disabled={!selectedSet || selectedSet.isDefault} type="primary"
                shape="round" onClick={setDefault} style={{marginTop: 5}}>Default</Button>
        <Button disabled={!selectedSet} type="primary" shape="round" onClick={showEditNameModal}
                style={{marginTop: 5}}>Rename</Button>
        <Modal
          title={`Rename "${selectedSet?.name}"?`}
          open={isModalOpen}
          onOk={handleEditNameOk}
          onCancel={handleEditNameCancel}
        >
          <Input
            type="text"
            name="username"
            onChange={e => setEditSetName(e.target.value)}
            width={600}
            value={editSetName}
          />
        </Modal>
        <Button type="primary" shape="round" onClick={add} style={{marginTop: 5}}>Add new set</Button>
        <Popconfirm
          title={`Are you sure you want to Delete trades set "${selectedSet?.name}"?`}
          icon={<QuestionCircleOutlined style={{color: 'red'}}/>}
          onConfirm={deleteSet}
          okText="Yes"
          cancelText="No"
        >
          <Button
            disabled={!selectedSet}
            type={'text'}
            size={'small'}
            danger
          >
            <DeleteOutlined/>
          </Button>
        </Popconfirm>
      </Space>
      <TabTradeSettings tradeSet={selectedSet}/>
    </div>
  );
}
