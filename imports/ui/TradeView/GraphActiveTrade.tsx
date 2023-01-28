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

  const roundAndScale = (num: number) => {
    return Math.round(num * 100);
  };

  if (monitoredPrices && monitoredPrices.length) {
    initialTime = dayjs(monitoredPrices[0].whenNY);
    // Normalize prices to zero and scale up.
    monitoredPrices.forEach((price: IPrice) => {
      price.underlyingPrice = roundAndScale((price.underlyingPrice ?? 0) - monitoredPrices[0].underlyingPrice ?? 0);
      price.vix = roundAndScale((price.vix ?? 0) - monitoredPrices[0].vix ?? 0);
      price.shortStraddlePrice = roundAndScale((price.shortStraddlePrice ?? 0) - monitoredPrices[0].shortStraddlePrice ?? 0);
      price.extrinsicShort = roundAndScale((price.extrinsicShort ?? 0) - monitoredPrices[0].extrinsicShort ?? 0);
      price.extrinsicLong = roundAndScale((price.extrinsicLong ?? 0) - monitoredPrices[0].extrinsicLong ?? 0);
      price.gain = roundAndScale(price.gain);
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