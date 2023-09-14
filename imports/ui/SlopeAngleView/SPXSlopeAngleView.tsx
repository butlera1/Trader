import React, {useState} from 'react';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
import {CartesianGrid, Label, Legend, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
import dayjs from 'dayjs';

let handle = null;

function getDateTime(record) {
  return dayjs(record?.when).format('h:mm:ss');
}

function getAngleFromArray(angleValue) {
  return angleValue;
}

function SPXSlopeAngleView() {
  const [spxAngleData, setSpxAngleData] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [domainMax, setDomainMax] = useState(10);
  const [domainMin, setDomainMin] = useState(0);

  const symbol = '$SPX.X';

  if (handle) {
    Meteor.clearTimeout(handle);
  }
  handle = Meteor.setTimeout(() => {
    Meteor.call('LatestQuote', symbol, (err, res) => {
      if (err) {
        setErrorMessage(err.message);
      } else {
        setSpxAngleData(oldArray => [...oldArray, res]);
        setDomainMax(res.maxMark);
        setDomainMin(res.minMark);
      }
    });
  }, 1000);

  return (
    <div>
      <span>{symbol} Mark & Slope Angle:</span>
      <LineChart width={900} height={300} data={spxAngleData} margin={{top: 5, right: 20, bottom: 5, left: 0}}>
        <CartesianGrid stroke="#ccc" strokeDasharray="5 5"/>
        <XAxis dataKey={getDateTime}/>
        <YAxis width={70} yAxisId="left" tick={{fontSize: 10}} domain={[-50, 50]}>
          <Label
            value={`${symbol} Slope Angle`}
            angle={-90}
            position="outside"
            fill="#676767"
            fontSize={14}
          />
        </YAxis>
        <YAxis width={120} yAxisId="right" orientation="right" tick={{fontSize: 10,}} domain={[domainMin, domainMax]}>
          <Label
            value={`${symbol} Mark`}
            angle={-90}
            position="outside"
            fill="#676767"
            fontSize={14}
          />
        </YAxis>
        <Line yAxisId="left" type="monotone" dataKey="slopeAngle" stroke="blue" dot={false} isAnimationActive={false}/>
        <Line yAxisId="right" type="monotone" dataKey="mark" stroke="red" dot={false} isAnimationActive={false}/>
        <Line yAxisId="right" type="monotone" dataKey="vwap" stroke="green" dot={false} isAnimationActive={false}/>
        <Legend/>
        <Tooltip/>
      </LineChart>
      {errorMessage ? <h1>{errorMessage}</h1> : null}
    </div>
  );
}

export default SPXSlopeAngleView;