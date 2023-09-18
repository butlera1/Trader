import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import {CartesianGrid, Label, Legend, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
import ITradeSettings, {IPrice} from '../../Interfaces/ITradeSettings';
import dayjs from 'dayjs';
import {CalculateGain} from '../../Utils';

function calculateGainGraphLine(tradeSettings, price) {
  let gainOrLoss = CalculateGain(tradeSettings, price);
  return Math.round(gainOrLoss * 100) / 100;
}

function GraphTrade({liveTrade}: { liveTrade: ITradeSettings }) {
  let initialTime = liveTrade.monitoredPrices[0] ? dayjs(liveTrade.monitoredPrices[0].whenNY) : dayjs();
  const lastPrice = liveTrade.monitoredPrices[liveTrade.monitoredPrices.length - 1];
  const vwapMax = lastPrice?.maxVWAPMark ?? 0 + 1;
  const vwapMin = lastPrice?.minVWAPMark ?? 0 - 1;

  const getTime = (price: IPrice) => {
    return dayjs(price.whenNY).diff(initialTime, 'minute', true).toFixed(1);
  };

  const round = (num: number) => {
    return Math.round(num * 100) / 100;
  };

  let gainLine = calculateGainGraphLine(liveTrade, liveTrade.gainLimit);
  let lossLine = calculateGainGraphLine(liveTrade, liveTrade.lossLimit);
  const monitoredPrices = liveTrade.monitoredPrices || [];
  let initialShortStraddlePrice = Math.abs(monitoredPrices[0]?.shortStraddlePrice ?? 0);

  const getShortStraddlePrice = (price) => round((Math.abs(price.shortStraddlePrice) ?? 0) - initialShortStraddlePrice) * 100;
  const getGain = (price) => round(price.gain);

  return (
    <LineChart
      width={900}
      height={500}
      data={monitoredPrices}
    >
      <CartesianGrid strokeDasharray="3 3"/>
      <YAxis width={70} yAxisId="left" tick={{fontSize: 10}} >
        <Label
          value={`Gain/Loss`}
          angle={-90}
          position="outside"
          fill="#676767"
          fontSize={14}
        />
      </YAxis>
      <YAxis width={120} yAxisId="right" orientation="right" tick={{fontSize: 10,}} domain={[vwapMin, vwapMax]}>
        <Label
          value={`Underlying Mark`}
          angle={-90}
          position="outside"
          fill="#676767"
          fontSize={14}
        />
      </YAxis>
      <YAxis width={100} yAxisId="right2" orientation="right" tick={{fontSize: 10,}} domain={[-3, 3]}>
        <Label
          value={`VWAP Slope Angle`}
          angle={-90}
          position="outside"
          fill="#676767"
          fontSize={14}
        />
      </YAxis>
      <XAxis dataKey={getTime} unit={'m'}/>
      <Tooltip/>
      <Legend/>
      <Line type="monotone" dataKey={() => gainLine} name={'Max Gain'} stroke="cyan" dot={false}
            isAnimationActive={false} yAxisId="left"/>
      <Line type="monotone" strokeWidth={2} dataKey={getGain} name={'G/L'} stroke="green" dot={false}
            isAnimationActive={false} yAxisId="left"/>
      <Line type="monotone" strokeWidth={1} dataKey={'vwapMark'} name={'Underlying'} stroke="red" dot={false}
            isAnimationActive={false} yAxisId="right"/>
      <Line type="monotone" strokeWidth={1} dataKey="vwap" name={'VWAP'} stroke="blue" dot={false}
            isAnimationActive={false} yAxisId="right"/>
      <Line type="monotone" strokeWidth={1} dataKey="vwapSlopeAngle" name={'VWAP Slope Angle'} stroke="grey" dot={false}
            isAnimationActive={false} yAxisId="right2"/>
      {/*<Line type="monotone" dataKey={getShortStraddlePrice} name={'Short Straddle'} stroke="lightgreen" dot={false}*/}
      {/*      isAnimationActive={false} yAxisId="left"/>*/}
      <Line type="monotone" dataKey={() => lossLine} name={'Max Loss'} stroke="cyan" dot={false}
            isAnimationActive={false} yAxisId="left"/>
    </LineChart>
  );
}


export default GraphTrade;