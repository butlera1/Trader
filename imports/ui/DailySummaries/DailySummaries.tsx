import React from "react";
import {DatePicker, Space} from "antd";
import {IDailyTradeSummary} from "../../../server/collections/DailyTradeSummaries.ts";
import {GetDayOfTheWeek, GetNewYorkTimeAsText} from "../../Utils.ts";
import DailySummaryChart from "./DailySummaryChart.tsx";

const {RangePicker} = DatePicker;

function SingleDaySummary({daySummary}: { daySummary: IDailyTradeSummary }) {
  const dateText = GetNewYorkTimeAsText(daySummary.dayDate).split(' ')[0] + ' (' + GetDayOfTheWeek(daySummary.dayDate) + ')';
  return (
    <Space direction={'horizontal'}>
      <span>{dateText}</span>
      <DailySummaryChart trades={daySummary.trades}/>
    </Space>
  );
}

function ListCharts({summaries}: { summaries: IDailyTradeSummary[] }) {
  const daySummaryArray = summaries.map((singleDay, index) => <SingleDaySummary key={index} daySummary={singleDay}/>);
  return (
    <Space direction={"vertical"}>
      {daySummaryArray}
    </Space>
  );
}

export function DailySummaries() {
  const [summaries, setSummaries] = React.useState([] as IDailyTradeSummary[]);

  function onChange(dates) {
    if (dates?.length===2) {
      console.log('OnChange has two dates', dates[0].format('MM-DD-YYYY hh:mm'), dates[1].format('MM-DD-YYYY hh:mm'));
      Meteor.call('GetDailyTradeSummariesForUserAndDayRange', dates[0].toDate(), dates[1].toDate(), (error, dailySummaries) => {
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
      <RangePicker onChange={onChange}/>
      <br/>
      <br/>
      <ListCharts summaries={summaries}/>
    </div>
  )
}