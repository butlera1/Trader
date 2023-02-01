import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import {CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
import ITradeSettings, {IPrice} from '../../Interfaces/ITradeSettings';
import dayjs from 'dayjs';

function GraphTrade({liveTrade}: { liveTrade: ITradeSettings }) {
  let initialTime = dayjs();

  const getTime = (price: IPrice) => {
    return dayjs(price.whenNY).diff(initialTime, 'minute', true).toFixed(1);
  };

  const round = (num: number) => {
    return Math.round(num * 100) / 100;
  };

  const monitoredPrices = liveTrade.monitoredPrices;
  if (monitoredPrices && monitoredPrices.length) {
    initialTime = dayjs(monitoredPrices[0].whenNY);
    const initialUnderlyingPrice = monitoredPrices[0].underlyingPrice ?? 0;
    const initialLongStraddlePrice = monitoredPrices[0].longStraddlePrice ?? 0;
    const initialShortStraddlePrice = monitoredPrices[0].shortStraddlePrice ?? 0;
    // Normalize prices to zero and scale up.
    monitoredPrices.forEach((price: IPrice) => {
      price.underlyingPrice = round((price.underlyingPrice ?? 0) - initialUnderlyingPrice) * liveTrade.quantity * 10;
      price.longStraddlePrice = round((price.longStraddlePrice ?? 0) - initialLongStraddlePrice) * 100;
      price.shortStraddlePrice = round((price.shortStraddlePrice ?? 0) - initialShortStraddlePrice) * 100;
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
      <Line type="monotone" dataKey="gain" name={'G/L'} stroke="green" dot={false} isAnimationActive={false}/>
      <Line type="monotone" dataKey="underlyingPrice" name={'Underlying'} stroke="red" dot={false}
            isAnimationActive={false}/>
      <Line type="monotone" dataKey="longStraddlePrice" name={'L-Strad'} stroke="lightblue" dot={false}
            isAnimationActive={false}/>
      <Line type="monotone" dataKey="shortStraddlePrice" name={'S-Strad'} stroke="lightgreen" dot={false}
            isAnimationActive={false}/>
    </LineChart>
  );
}


export default GraphTrade;