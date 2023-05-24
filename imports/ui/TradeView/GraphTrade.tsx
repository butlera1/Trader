import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import {CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
import ITradeSettings, {IPrice} from '../../Interfaces/ITradeSettings';
import dayjs from 'dayjs';
import {CalculateGain} from '../../Utils';

function calculateGainGraphLine(tradeSettings, price) {
  let gainOrLoss = CalculateGain(tradeSettings, price);
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
  const monitoredPrices = liveTrade.monitoredPrices || [];
  const initialUnderlyingPrice = monitoredPrices[0]?.underlyingPrice ?? 0;
  const initialLongStraddlePrice = Math.abs(monitoredPrices[0]?.longStraddlePrice ?? 0);
  let initialShortStraddlePrice = Math.abs(monitoredPrices[0]?.shortStraddlePrice ?? 0);

  const getUnderlying = (price) => round((price.underlyingPrice ?? 0) - initialUnderlyingPrice) * 10;
  const getLongStraddlePrice = (price) => {
    return round((Math.abs(price.longStraddlePrice) ?? 0) - initialLongStraddlePrice) * 100;
  };
  const getShortStraddlePrice = (price) => round((Math.abs(price.shortStraddlePrice) ?? 0) - initialShortStraddlePrice) * 100;
  const getGain = (price) => round(price.gain);

  return (
    <LineChart
      width={600}
      height={400}
      data={monitoredPrices}
    >
      <CartesianGrid strokeDasharray="3 3"/>
      <YAxis/>
      <XAxis dataKey={getTime} unit={'m'}/>
      <Tooltip/>
      <Legend/>
      <Line type="monotone" dataKey={() => gainLine} name={'Max Gain'} stroke="cyan" dot={false}
            isAnimationActive={false}/>
      <Line type="monotone" strokeWidth={2} dataKey={getGain} name={'G/L'} stroke="green" dot={false}
            isAnimationActive={false}/>
      <Line type="monotone" strokeWidth={2} dataKey={getUnderlying} name={'Underlying'} stroke="red" dot={false}
            isAnimationActive={false}/>
      <Line type="monotone" dataKey={getLongStraddlePrice} name={'Long Straddle'} stroke="lightpink" dot={false}
            isAnimationActive={false}/>
      <Line type="monotone" dataKey={getShortStraddlePrice} name={'Short Straddle'} stroke="lightgreen" dot={false}
            isAnimationActive={false}/>
      <Line type="monotone" dataKey={() => lossLine} name={'Max Loss'} stroke="cyan" dot={false}
            isAnimationActive={false}/>
    </LineChart>
  );
}


export default GraphTrade;