import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import {CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
import ITradeSettings, {IPrice} from '../../Interfaces/ITradeSettings';
import dayjs from 'dayjs';

function calculateGainGraphLine(tradeSettings, price) {
  const {openingPrice, quantity} = tradeSettings;
  let gainOrLoss = (Math.abs(openingPrice) - price) * 100.0 * quantity;
  if (openingPrice > 0) {
    // We are in a long position.
    gainOrLoss = (Math.abs(price) - openingPrice) * 100.0 * quantity;
  }
  return Math.round(gainOrLoss * 100) / 100;
}

function GraphTrade({liveTrade}: { liveTrade: ITradeSettings }) {
  let initialTime = liveTrade.monitoredPrices[0] ? dayjs(liveTrade.monitoredPrices[0].whenNY) : dayjs();

  const getTime = (price: IPrice) => {
    return dayjs(price.whenNY).diff(initialTime, 'minute', true).toFixed(1);
  };

  const round = (num: number) => {
    return Math.round(num * 100) / 100;
  };

  let gainLine = calculateGainGraphLine(liveTrade, liveTrade.gainLimit);
  let lossLine = calculateGainGraphLine(liveTrade, liveTrade.lossLimit);
  const monitoredPrices = liveTrade.monitoredPrices;
  const initialUnderlyingPrice = monitoredPrices[0]?.underlyingPrice ?? 0;
  const initialLongStraddlePrice = monitoredPrices[0]?.longStraddlePrice ?? 0;
  let initialShortStraddlePrice = monitoredPrices[0]?.shortStraddlePrice ?? 0;

  const getUnderlying = (price) => round((price.underlyingPrice ?? 0) - initialUnderlyingPrice) * liveTrade.quantity * 10;
  const getLongStraddlePrice = (price) => round((price.longStraddlePrice ?? 0) - initialLongStraddlePrice) * 100 * liveTrade.quantity;
  const getShortStraddlePrice = (price) => round((price.shortStraddlePrice ?? 0) - initialShortStraddlePrice) * 100 * liveTrade.quantity;
  const getGain = (price) => round(price.gain);

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
      <Line type="monotone" strokeWidth={2} dataKey={getGain} name={'G/L'} stroke="green" dot={false}
            isAnimationActive={false}/>
      <Line type="monotone" strokeWidth={2} dataKey={getUnderlying} name={'Underlying'} stroke="red" dot={false}
            isAnimationActive={false}/>
      <Line type="monotone" dataKey={getLongStraddlePrice} name={'L-Strad'} stroke="lightpink" dot={false}
            isAnimationActive={false}/>
      <Line type="monotone" dataKey={getShortStraddlePrice} name={'S-Strad'} stroke="lightgreen" dot={false}
            isAnimationActive={false}/>
      <Line type="monotone" dataKey={() => gainLine} name={'G-limit'} stroke="cyan" dot={false}
            isAnimationActive={false}/>
      <Line type="monotone" dataKey={() => lossLine} name={'L-limit'} stroke="cyan" dot={false}
            isAnimationActive={false}/>
    </LineChart>
  );
}


export default GraphTrade;