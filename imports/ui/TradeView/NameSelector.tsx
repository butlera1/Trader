import React, {useEffect} from 'react';
import {Select} from "antd";
import {Meteor} from "meteor/meteor";

const NameSelector = ({isMultiple, width, setSelectedNames: setSelectedName}) => {
    const [namesAndIds, setTradeSettingNamesAndIds] = React.useState([]);

    useEffect(() => {
        Meteor.call('GetTradeSettingNames', (error, namesAndIds) => {
            if (error) {
                alert(`Failed to get trade setting names. Error: ${error}`);
                return;
            }
            setTradeSettingNamesAndIds([...namesAndIds]);
        });
    }, []);

    const modeText = isMultiple ? 'multiple' : undefined;

    const options = namesAndIds.map(({_id, name}) => <Select.Option key={_id} value={_id}>{name}</Select.Option>);

    return (
        <Select mode={modeText} style={{width: width}} onChange={setSelectedName}>
            {options}
        </Select>);
};

export default NameSelector;