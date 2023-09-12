import React, {useState} from 'react';
// @ts-ignore
import {Meteor} from 'meteor/meteor';
import {CartesianGrid, Label, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
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

  if (handle) {
    Meteor.clearTimeout(handle);
  }
  handle = Meteor.setTimeout(() => {
    Meteor.call('LatestQuote', '$SPX.X', (err, res) => {
      if (err) {
        setErrorMessage(err.message);
      } else {
        setSpxAngleData(oldArray => [...oldArray, res]);
        setDomainMax(res.maxMark+10);
        setDomainMin(res.minMark-10);
      }
    });
  }, 1000);

  return (
    <div>
      <LineChart width={600} height={300} data={spxAngleData} margin={{top: 5, right: 20, bottom: 5, left: 0}}>
        <CartesianGrid stroke="#ccc" strokeDasharray="5 5"/>
        <XAxis dataKey={getDateTime}/>
        <YAxis width={80} yAxisId="left" tick={{ fontSize: 10 }} >
          <Label
            value="Slope Angle"
            angle={-90}
            position='outside'
            fill='#676767'
            fontSize={14}
          />
        </YAxis>
        <YAxis width={80} yAxisId="right" orientation="right" tick={{ fontSize: 10, }} domain={[domainMin, domainMax]}>
          <Label
            value="Mark"
            angle={-90}
            position='outside'
            fill='#676767'
            fontSize={14}
          />
        </YAxis>
        <Line yAxisId="left"  type="monotone" dataKey="slopeAngle" stroke="blue" dot={false} isAnimationActive={false}/>
        <Line yAxisId="right"  type="monotone" dataKey="mark" stroke="red" dot={false} isAnimationActive={false}/>
        <Tooltip/>
      </LineChart>
      {errorMessage ? <h1>{errorMessage}</h1> : null}
    </div>
  );
}

export default SPXSlopeAngleView;