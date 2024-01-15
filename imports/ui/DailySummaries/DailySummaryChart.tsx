import React from "react";
import {ITradeSummary} from "../../../server/collections/DailyTradeSummaries.ts";
import {CartesianGrid, Label, Line, LineChart, Tooltip, XAxis, YAxis} from "recharts";
import {GetNewYorkTimeAsText} from "../../Utils.ts";

function getDateTime(record: ITradeSummary) {
  return GetNewYorkTimeAsText(record.whenClosed);
}

const CustomTooltip = ({active, payload, label}) => {
  if (active && payload && payload.length) {
    const items = payload.map((item, index) => <span style={{color: item.color, display: 'block'}} key={index}>{`${item.name} : ${item.value}`}</span>);
    const tradePatternName = payload[0].payload.description.split(':')[0];
    return (
      <div style={{backgroundColor: 'rgba(100, 100, 100, 0.1)'}}>
        <span key={-1}>{label} ({tradePatternName})</span>
        {items}
      </div>
    );
  }
  return null;
};

function DailySummaryChart({trades}:{trades: ITradeSummary[]}) {
  return (
    <LineChart width={1200} height={200} data={trades ?? []} margin={{top: 5, right: 20, bottom: 5, left: 0}}>
      <Line type="monotone" dataKey="gainLoss" stroke="red" dot={false} strokeWidth={1}/>
      <CartesianGrid stroke="#ccc" strokeDasharray="5 5"/>
      <XAxis dataKey={getDateTime}/>
      <YAxis width={90} tick={{fontSize: 10}} allowDecimals={false}>
        <Label
          value={`Results`}
          angle={-90}
          position="outside"
          fill="#676767"
          fontSize={14}
        />
      </YAxis>
      <Tooltip content={<CustomTooltip />} />
    </LineChart>
  );
}

export default DailySummaryChart;