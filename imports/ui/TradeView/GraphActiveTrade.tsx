import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import {CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
import {IPrice} from '../../Interfaces/ITradeSettings';
import dayjs from 'dayjs';

function GraphActiveTrade({monitoredPrices}: { monitoredPrices: IPrice[] }) {


  let initialTime = dayjs();

  const getTime = (price: IPrice) => {
    return dayjs(price.whenNY).diff(initialTime, 'minute', true).toFixed(1);
  };

  const round = (num: number) => {return Math.round(num * 100) / 100};

  if (monitoredPrices && monitoredPrices.length) {
    initialTime = dayjs(monitoredPrices[0].whenNY);
    // normalize to zero the underlying price.
    const startingUnderlyingPrice = monitoredPrices[0].underlyingPrice;
    monitoredPrices.forEach((price: IPrice) => {
      price.underlyingPrice = round((price.underlyingPrice - startingUnderlyingPrice) * 100);
      price.gain = round(price.gain);
    });
  }



  return (
    <LineChart
      width={400}
      height={300}
      data={monitoredPrices}
    >
      <CartesianGrid strokeDasharray="3 3"/>
      <YAxis/>
      <XAxis dataKey={getTime} unit={'m'}/>
      <Tooltip/>
      <Legend/>
      <Line type="monotone" dataKey="gain" stroke="green" dot={false} isAnimationActive={false}/>
      <Line type="monotone" dataKey="underlyingPrice" stroke="red" dot={false} isAnimationActive={false}/>
    </LineChart>
  );
}


export default GraphActiveTrade;