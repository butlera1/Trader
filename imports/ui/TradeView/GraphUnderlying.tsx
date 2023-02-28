import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import {CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
import Constants from '../../Constants';
import {StreamedData} from '../../Collections/StreamedData';
import IStreamData from '../../Interfaces/IStreamData';
import dayjs from 'dayjs';
import {Space} from 'antd';

function GraphUnderlying({symbol}: { symbol: string }) {
  const data = useTracker(() => {
    const record = StreamedData.findOne(Constants.streamedDataId);
    const valuesArray: IStreamData = record[symbol] ?? [];
    return valuesArray;
  }, [symbol, StreamedData]);

  const initialMark = data[0]?.mark ?? 0;
  const currentMark = data[data.length - 1]?.mark ?? 0;
  const diff = currentMark - initialMark;
  const max = Math.max(...data.map(o => o.mark));
  const min = Math.min(...data.map(o => o.mark));

  const getMark = (sample: IStreamData) => {
    return sample.mark;
  };

  const getWhen = (sample: IStreamData) => {
    return dayjs(sample.when).format('HH:mm:ss');
  };

  return (
    <>
      <br/>
      <Space direction={'horizontal'}>
        <p><b>Open: </b>{initialMark.toFixed(2)}</p>
        <p><b>Current: </b>{currentMark.toFixed(2)}</p>
        <p><b>Diff: </b>{diff.toFixed(3)}</p>
      </Space>
      <LineChart
        width={1500}
        height={400}
        data={data}
      >
        <CartesianGrid strokeDasharray="3 3"/>
        <YAxis domain={[min, max]}/>
        <XAxis dataKey={getWhen}/>
        <Tooltip/>
        <Legend/>
        <Line type="monotone" strokeWidth={2} dataKey={getMark} name={symbol} stroke="black" dot={false}
              isAnimationActive={false}/>
      </LineChart>
    </>

  );
}


export default GraphUnderlying;