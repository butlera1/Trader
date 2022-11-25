import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {IPrice} from '../../Interfaces/ITradeSettings';

// const data = [
//   {
//     name: 'Page A',
//     uv: 4000,
//     pv: 2400,
//     amt: 2400,
//   },
//   {
//     name: 'Page B',
//     uv: 3000,
//     pv: 1398,
//     amt: 2210,
//   },
//   {
//     name: 'Page C',
//     uv: 2000,
//     pv: 9800,
//     amt: 2290,
//   },
//   {
//     name: 'Page D',
//     uv: 2780,
//     pv: 3908,
//     amt: 2000,
//   },
//   {
//     name: 'Page E',
//     uv: 1890,
//     pv: 4800,
//     amt: 2181,
//   },
//   {
//     name: 'Page F',
//     uv: 2390,
//     pv: 3800,
//     amt: 2500,
//   },
//   {
//     name: 'Page G',
//     uv: 3490,
//     pv: 4300,
//     amt: 2100,
//   },
// ];

function GraphActiveTrade({data}: {data: IPrice[]}) {
  return (
    // <ResponsiveContainer width="30%" height="20%">
      <LineChart
        width={500}
        height={300}
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3"/>
        <XAxis dataKey="whenNY"/>
        <YAxis/>
        <Tooltip/>
        <Legend/>
        <Line type="monotone" dataKey="price" stroke="#8884d8" activeDot={{r: 8}}/>
      </LineChart>
    // </ResponsiveContainer>
  );
}


export default GraphActiveTrade;