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
    const initialUnderlyingPrice = monitoredPrices[0].underlyingPrice ?? 0;
    const initialPrice = monitoredPrices[0].price ?? 0;
    // Normalize prices to zero and scale up.
    monitoredPrices.forEach((price: IPrice) => {
      price.underlyingPrice = roundAndScale((price.underlyingPrice ?? 0) - initialUnderlyingPrice) / 10;
      // price.shortStraddlePrice = roundAndScale(price.shortStraddlePrice)/100;
      // price.extrinsicShort = roundAndScale(price.extrinsicShort)/100;
      // price.extrinsicLong = roundAndScale(price.extrinsicLong)/100;
      price.gain = roundAndScale(price.gain) / 100;
      // price.price = roundAndScale(price.price - initialPrice);
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
      {/*<Line type="monotone" dataKey="price" stroke="black" dot={false} isAnimationActive={false}/>*/}
      <Line type="monotone" dataKey="gain" stroke="green" dot={false} isAnimationActive={false}/>
      <Line type="monotone" dataKey="underlyingPrice" stroke="red" dot={false} isAnimationActive={false}/>
      {/*<Line type="monotone" dataKey="shortStraddlePrice" stroke="pink" dot={false} isAnimationActive={false}/>*/}
      {/*<Line type="monotone" dataKey="extrinsicLong" stroke="blue" dot={false} isAnimationActive={false}/>*/}
      {/*<Line type="monotone" dataKey="extrinsicShort" stroke="orange" dot={false} isAnimationActive={false}/>*/}
    </LineChart>
  );
}


export default GraphActiveTrade;