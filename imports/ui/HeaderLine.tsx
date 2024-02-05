import React from "react";
import {UserOutlined} from '@ant-design/icons';
import Constants from '../Constants';
import {IAppSettings} from "../Interfaces/IAppSettings.ts";

function HeaderLine() {
  const [usingPriceText, setUsingPriceText] = React.useState('???');

  React.useEffect(() => {
    Meteor.call('GetAppSettings', (error, results: IAppSettings) => {
      if (error) {
        alert(error);
        return;
      }
      setUsingPriceText(results.usingMarkPrice ? 'Mark':'Bid/Ask');
    });
  }, []);

  return (
    <p style={{color: 'blue'}}>
      <UserOutlined/> {Meteor.user().username}
      <span
        style={{color: 'grey'}}>  (Vr. {Constants.version}) Using {usingPriceText} price.
      </span>
    </p>
  );
}

export default HeaderLine;