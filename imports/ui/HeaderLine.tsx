import React from "react";
import {UserOutlined} from '@ant-design/icons';
import Constants from '../Constants';

function HeaderLine() {
  const UsingPriceText = Constants.usingMarkPrice ? 'Mark':'Bid/Ask';

  return (
    <p style={{color: 'blue'}}>
      <UserOutlined/> {Meteor.user().username}
      <span
        style={{color: 'grey'}}>  (Vr. {Constants.version}) Using {UsingPriceText} price.
      </span>
    </p>
  );
}

export default HeaderLine;