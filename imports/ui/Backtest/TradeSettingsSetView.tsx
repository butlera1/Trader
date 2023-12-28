import React from "react";
import {Meteor} from "meteor/meteor";

function TradeSettingsSetView({setId}: { setId: string }) {
  const [descriptions, setDescriptions] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (setId) {
      Meteor.call('GetTradeSettingsInfoFromSetId', setId, (error, result: string[]) => {
        if (error) {
          alert(`Error getting Trade Setting descriptions: ${error}`);
        } else {
          if (result?.length > 0) {
            setDescriptions(result);
          }
        }
      });
    }
  }, [setId]);

  return (
    <ul>
      {descriptions.map((description, index) => {
        return <li key={index}>{description}</li>;
      })}
    </ul>
  );
}

export default TradeSettingsSetView;