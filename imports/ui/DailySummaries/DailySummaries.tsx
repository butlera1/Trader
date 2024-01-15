import React from "react";
import {DatePicker} from "antd";
import {IDailyTradeSummary} from "../../../server/collections/DailyTradeSummaries.ts";

const { RangePicker } = DatePicker;


export function DailySummaries() {
  const [summaries, setSummaries] = React.useState([] as IDailyTradeSummary[]);

  function onChange(dates) {
    if (dates?.length===2) {
      console.log('OnChange has two dates', dates[0].format('MM-DD-YYYY hh:mm'), dates[1].format('MM-DD-YYYY hh:mm'));
      Meteor.call('GetDailyTradeSummariesForUserAndDayRange', dates[0], dates[1], (error, dailySummaries) => {
        if (error) {
          alert(`Failed to get daily summaries. Error: ${error}`);
          return;
        }
        setSummaries(dailySummaries);
      });
    }
  }

  return (
    <div>
      <h2>Daily Summaries</h2>
      <RangePicker onChange={onChange}  />
    </div>
  )
}