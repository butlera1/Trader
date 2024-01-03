import {Meteor} from 'meteor/meteor';
import {useTracker} from 'meteor/react-meteor-data';
import {Random} from 'meteor/random';
import React, {useState} from 'react';
import Ranges from '../../Collections/Ranges.js';
import {Button, Input, Modal, Popconfirm, Select, Space} from "antd";
import {DeleteOutlined, QuestionCircleOutlined} from "@ant-design/icons";
import RangesEditor from "./RangesEditor.tsx";
import IRanges, {GetDefaultRanges} from "../../Interfaces/IRanges.ts";

const defaultRanges = GetDefaultRanges();

function getName(range: IRanges) {
  return `${range.name || 'No name'}${range.isDefault ? ' *':''}`
}

function getDefault() : IRanges {
  const rangesArray = Ranges.find().fetch() ?? [];
  let record = rangesArray.find((range: IRanges) => range.isDefault) ?? rangesArray[0];
  return record || {};
}

export default function BacktestPatternsEditor() {
  const rangesArray = useTracker(() => Ranges.find().fetch(), [Ranges]) as IRanges[];
  const [selectedRange, setSelectedRange] = React.useState(getDefault());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editName, setEditName] = useState('');


  const showEditNameModal = () => {
    setEditName(selectedRange.name);
    setIsModalOpen(true);
  };

  const handleEditNameOk = () => {
    setIsModalOpen(false);
    selectedRange.name = editName;
    const _id = selectedRange._id || Random.id();
    delete selectedRange._id;
    Ranges.upsert(_id, selectedRange);
    selectedRange._id = _id;
    setSelectedRange({...selectedRange}); // Force re-render of select component.
  };

  const handleEditNameCancel = () => {
    setIsModalOpen(false);
  };

  const add = () => {
    const tempSet = GetDefaultRanges();
    tempSet.userId = Meteor.userId();
    tempSet.name = `New Range Group ${new Date().toLocaleString()}`;
    tempSet._id = Ranges.insert(tempSet);
    setSelectedRange(tempSet);
  };

  const deleteSet = () => {
    Ranges.remove(selectedRange._id);
    setSelectedRange(getDefault());
  };

  const setDefault = () => {
    const currentDefaultId = rangesArray.find(record => record.isDefault)?._id;
    if (currentDefaultId!==selectedRange._id) {
      Ranges.update(currentDefaultId, {$set: {isDefault: false}});
      Ranges.update(selectedRange._id, {$set: {isDefault: true}});
      setSelectedRange({...selectedRange}); // Force refresh.
    }
  };

  return (
    <div style={{width: 1300, border: '1px solid grey', marginTop: 15, padding: 10}}>
      <Space style={{marginBottom: 30}}>
        <h3 style={{marginBottom: 0}}>Ranges Pattern:</h3>
        <Select
          style={{width: 600}}
          onChange={(id) => setSelectedRange(rangesArray.find((record) => record._id===id))}
          defaultValue={selectedRange?._id}
          value={selectedRange?._id}
        >
          {rangesArray.map((record) => <Select.Option key={record._id} value={record._id}>{getName(record)}</Select.Option>)}
        </Select>
        <Button disabled={!selectedRange || selectedRange.isDefault} type="primary"
                shape="round" onClick={setDefault} style={{marginTop: 5}}>Default</Button>
        <Button disabled={!selectedRange} type="primary" shape="round" onClick={showEditNameModal}
                style={{marginTop: 5}}>Rename</Button>
        <Modal
          title={`Rename "${selectedRange?.name}"?`}
          open={isModalOpen}
          onOk={handleEditNameOk}
          onCancel={handleEditNameCancel}
        >
          <Input
            type="text"
            name="username"
            onChange={e => setEditName(e.target.value)}
            width={600}
            value={editName}
          />
        </Modal>
        <Button type="primary" shape="round" onClick={add} style={{marginTop: 5}}>Create group</Button>
        <Popconfirm
          title={`Are you sure you want to Delete ranges group "${selectedRange?.name}"?`}
          icon={<QuestionCircleOutlined style={{color: 'red'}}/>}
          onConfirm={deleteSet}
          okText="Yes"
          cancelText="No"
        >
          <Button
            disabled={!selectedRange}
            type={'text'}
            size={'small'}
            danger
          >
            <DeleteOutlined/>
          </Button>
        </Popconfirm>
      </Space>
      <RangesEditor ranges={selectedRange}/>
    </div>
  );
}
