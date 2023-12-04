// @ts-ignore
import {Meteor} from 'meteor/meteor';
import React, {useState} from 'react';
import {CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';

const initialData = [{name: 'Page A', uv: 400, pv: 2400, amt: 2400}, {name: 'Page B', uv: 410, pv: 2500, amt: 2500}];
let count = 0;

function TradeGraph() {
  const [data, setData] = useState(initialData);
  const intervalHandle = Meteor.setInterval(()=>{
    let oldData = data;
    if (intervalHandle && count > 25) {
      oldData = data.slice(1);
    }
    count++;
    const dataItem = {name: `Item ${count}`, uv: count*10+350, pv: 2400, amt: 2400};
    setData([...oldData, dataItem]);
  }, 10000);

  return (
    <LineChart width={600} height={300} data={data} margin={{top: 5, right: 20, bottom: 5, left: 0}}>
      <Line type="monotone" dataKey="uv" stroke="#8884d8"/>
      <CartesianGrid stroke="#ccc" strokeDasharray="5 5"/>
      <XAxis dataKey="name"/>
      <YAxis/>
      <Tooltip/>
    </LineChart>
  );
}

export default TradeGraph;