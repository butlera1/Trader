import React from "react";
import ITradeSettings, {IBacktestSummary, IDailyResult} from "../../Interfaces/ITradeSettings.ts";
import {GetNewYorkTimeAsText} from "../../Utils.ts";
import {Space} from "antd";
import ChartResults from "../TradeView/ChartResults.tsx";

function getDayOfTheWeek(date: Date) {
  const day = date.getDay();
  switch (day) {
    case 0:
      return 'Sunday';
    case 1:
      return 'Monday';
    case 2:
      return 'Tuesday';
    case 3:
      return 'Wednesday';
    case 4:
      return 'Thursday';
    case 5:
      return 'Friday';
    case 6:
      return 'Saturday';
  }
}

function SingleDaySummary({daySummary}: { daySummary: IDailyResult }) {
  const [trades, setTrades] = React.useState<ITradeSettings[]>([]);

  const dateText = GetNewYorkTimeAsText(daySummary.when).split(' ')[0] + ' (' + getDayOfTheWeek(daySummary.when) +')';
  React.useEffect(() => {
    Meteor.call('GetBacktestTradesFromIds', daySummary.trades, (error, results:ITradeSettings[]) => {
      if (error) {
        alert(error);
        return;
      }
      if (results?.length > 0) {
        setTrades(results.sort((a, b) => a.whenClosed.getTime() - b.whenClosed.getTime()));
      }
    });
  }, [daySummary]);

  return (
    <Space>
      <span>{dateText}</span>
      <ChartResults records={trades} isGraphPrerunningTrades={false} skipSPXChart={true}/>
    </Space>
  );
}

function BacktestSummaryView({summary}: { summary: IBacktestSummary }) {
  const daySummaryArray = summary.resultsPerDay.map((singleDay, index) => <SingleDaySummary key={index} daySummary={singleDay}/>);
  return (
    <Space direction={"vertical"}>
      {daySummaryArray}
    </Space>
  );
}

export default BacktestSummaryView;