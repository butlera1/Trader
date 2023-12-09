import React, {useEffect} from 'react';
import {Select} from "antd";
// @ts-ignore
import {Meteor} from "meteor/meteor";

const TradeSettingsSetSelector = ({sets, width, setSelected}) => {
    const options = sets.map(({_id, name}) => <Select.Option key={_id} value={_id}>{name}</Select.Option>);

    return (
        <Select style={{width: width}} onChange={setSelected}>
            {options}
        </Select>);
};

export default TradeSettingsSetSelector;