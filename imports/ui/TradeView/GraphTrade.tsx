import React from 'react';
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
  let underlyingMin = Number.MAX_VALUE;
  let underlyingMax = Number.MIN_VALUE;
  let vixMarkMin = Number.MAX_VALUE;
  let vixMarkMax = Number.MIN_VALUE;
  let vixSlopeMin = Number.MAX_VALUE;
  let vixSlopeMax = Number.MIN_VALUE;

  liveTrade.monitoredPrices.forEach((price) => {
    underlyingMin = Math.min(underlyingMin, price.underlyingPrice);
    underlyingMax = Math.max(underlyingMax, price.underlyingPrice);
    vixMarkMin = Math.min(vixMarkMin, price.vixMark);
    vixMarkMax = Math.max(vixMarkMax, price.vixMark);
    vixSlopeMin = Math.min(vixSlopeMin, price.vixSlope);
    vixSlopeMax = Math.max(vixSlopeMax, price.vixSlope);
  });

  const getTime = (price: IPrice) => {
    return dayjs(price.whenNY).diff(initialTime, 'minute', true).toFixed(1);
  };

  const round = (num: number) => {
    return Math.round(num * 100) / 100;
  };

  let gainLine = calculateGainGraphLine(liveTrade, liveTrade.gainLimit);
  let lossLine = calculateGainGraphLine(liveTrade, liveTrade.lossLimit);
  let maxLossRange = Math.min(lossLine, -gainLine) - 100;
  let maxGainRange = Math.max(gainLine, -lossLine) + 100; // Make the chart symmetrical around zero.
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
      <YAxis width={70} yAxisId="left" tick={{fontSize: 10}} domain={[maxLossRange, maxGainRange]} allowDecimals={false} ticks={[maxLossRange, 0, maxGainRange]}>
        <Label
          value={`Gain/Loss`}
          angle={-90}
          position="outside"
          fill="#676767"
          fontSize={14}
        />
      </YAxis>
      <YAxis width={70} yAxisId="right" orientation="right" tick={{fontSize: 10,}} domain={[underlyingMin, underlyingMax]} allowDecimals={false}>
        <Label
          value={`Underlying Mark`}
          angle={-90}
          position="outside"
          fill="#676767"
          fontSize={14}
        />
      </YAxis>
      <YAxis width={70} yAxisId="right2" orientation="right" tick={{fontSize: 10,}} domain={[vixMarkMin, vixMarkMax]} allowDecimals={false}>
        <Label
          value={`VIX Mark`}
          angle={-90}
          position="outside"
          fill="#676767"
          fontSize={14}
        />
      </YAxis>
      <YAxis width={70} yAxisId="right3" orientation="right" tick={{fontSize: 10,}} domain={[-1, 1]} allowDecimals={false}>
        <Label
          value={`VIX Slope`}
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
      <Line type="monotone" strokeWidth={1} dataKey={'underlyingPrice'} name={'Underlying'} stroke="red" dot={false}
            isAnimationActive={false} yAxisId="right"/>
      <Line type="monotone" strokeWidth={1} dataKey={'vixMark'} name={'VIX'} stroke="blue" dot={false}
            isAnimationActive={false} yAxisId="right2"/>
      <Line type="monotone" strokeWidth={1} dataKey={'vixSlope'} name={'VIX Slope'} stroke="grey" dot={false}
            isAnimationActive={false} yAxisId="right3"/>
      <Line type="monotone" dataKey={() => lossLine} name={'Max Loss'} stroke="cyan" dot={false}
            isAnimationActive={false} yAxisId="left"/>
    </LineChart>
  );
}


export default GraphTrade;