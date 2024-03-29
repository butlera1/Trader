import React, {useEffect} from 'react';
import {CartesianGrid, Label, Legend, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
import ITradeSettings, {IPrice} from '../../Interfaces/ITradeSettings';
import dayjs from 'dayjs';
import {CalculateGain} from '../../Utils';
// @ts-ignore
import {Meteor} from 'meteor/meteor';

function calculateGainGraphLine(tradeSettings, price) {
  let gainOrLoss = CalculateGain(tradeSettings, price);
  return Math.round(gainOrLoss * 100) / 100;
}

function clipNumber(value) {
  return Math.round(value * 100) / 100;
}

function AdditionalLines(vixMarkMin: number, vixMarkMax: number ) {
  console.log('Entering AdditionalLines');
  return (
    <>
      <YAxis width={70} yAxisId="vixAxis" orientation="right" tick={{fontSize: 10,}} domain={[vixMarkMin, vixMarkMax]}
             allowDecimals={true}>
        <Label
          value={`VIX`}
          angle={-90}
          position="outside"
          fill="#676767"
          fontSize={14}
        />
      </YAxis>
      <YAxis width={70} yAxisId="slopeAxis" orientation="right" tick={{fontSize: 10,}} domain={[-0.03, 0.03]}
             allowDecimals={true}>
        <Label
          value={`VIX Slope Angle`}
          angle={-90}
          position="outside"
          fill="#676767"
          fontSize={14}
        />
      </YAxis>
      <Line type="monotone" strokeWidth={1} dataKey={'vixMark'} name={'VIX'} stroke="blue" dot={false}
            isAnimationActive={false} yAxisId="vixAxis"/>
      <Line type="monotone" strokeWidth={1} dataKey={'vixSlopeAngle'} name={'VIX Slope Angle'} stroke="grey"
            dot={false}
            isAnimationActive={false} yAxisId="slopeAxis"/>
    </>
  );
}

function GraphTrade({liveTrade}: { liveTrade: ITradeSettings }) {
  let initialTime = liveTrade.monitoredPrices[0] ? dayjs(liveTrade.monitoredPrices[0].whenNY) : dayjs();
  let underlyingMin = Number.MAX_VALUE;
  let underlyingMax = Number.MIN_VALUE;
  let vixMarkMin = Number.MAX_VALUE;
  let vixMarkMax = Number.MIN_VALUE;

  liveTrade.monitoredPrices.forEach((price) => {
    underlyingMin = Math.min(underlyingMin, price.underlyingPrice);
    underlyingMax = Math.max(underlyingMax, price.underlyingPrice);
    vixMarkMin = Math.min(vixMarkMin, price.vixMark);
    vixMarkMax = Math.max(vixMarkMax, price.vixMark);
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

  const getGain = (price) => round(price.gain);

  underlyingMin = clipNumber(underlyingMin);
  underlyingMax = clipNumber(underlyingMax);
  vixMarkMin = clipNumber(vixMarkMin);
  vixMarkMax = clipNumber(vixMarkMax);

  const chartWidth = liveTrade.whyClosed ? 900 : 400;
  const chartHeight = liveTrade.whyClosed ? 500 : 200;

  return (
    <LineChart
      width={chartWidth}
      height={chartHeight}
      data={monitoredPrices}
    >
      <CartesianGrid strokeDasharray="3 3"/>
      <YAxis width={60} yAxisId="gainAxis" tick={{fontSize: 10}} domain={[maxLossRange, maxGainRange]}
             allowDecimals={false} ticks={[maxLossRange, 0, maxGainRange]}>
        <Label
          value={`Gain/Loss`}
          angle={-90}
          position="outside"
          fill="#676767"
          fontSize={14}
        />
      </YAxis>
      <YAxis width={70} yAxisId="underlyingAxis" orientation="right" tick={{fontSize: 10,}}
             domain={[underlyingMin, underlyingMax]} allowDecimals={true}>
        <Label
          value={`Underlying`}
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
            isAnimationActive={false} yAxisId="gainAxis"/>
      <Line type="monotone" strokeWidth={2} dataKey={getGain} name={'G/L'} stroke="green" dot={false}
            isAnimationActive={false} yAxisId="gainAxis"/>
      <Line type="monotone" strokeWidth={1} dataKey={'underlyingPrice'} name={'Underlying'} stroke="red" dot={false}
            isAnimationActive={false} yAxisId="underlyingAxis"/>
      {liveTrade.showVixAndSlopeInGraphs
        ?
        AdditionalLines(vixMarkMin, vixMarkMax)
        :
        null
      }
      <Line type="monotone" dataKey={() => lossLine} name={'Max Loss'} stroke="cyan" dot={false}
            isAnimationActive={false} yAxisId="gainAxis"/>;
    </LineChart>
  );
}


export default GraphTrade;