import React from 'react';
// @ts-ignore
import {useTracker} from 'meteor/react-meteor-data';
import Trades from '../../Collections/Trades';
import ITradeSettings from '../../Interfaces/ITradeSettings';

function ActiveTradesView() {
  const liveTrades: ITradeSettings[] = useTracker(() => Trades.find({}).fetch());

  return (
    <>
      <h1>{`Active Trades (${liveTrades.length})`}</h1>
      <ol style={{fontSize: 20}}>
        {liveTrades.map((trade, index) => {
          let price = 'None';
          let gl = <span style={{color: 'green'}}>Gain: 0.00</span>;
          if (trade?.monitoredPrices?.length > 0) {
            const item = trade.monitoredPrices[trade.monitoredPrices?.length - 1];
            price = item.price.toFixed(2);
            gl = <strong style={{color: (item.gain < 0) ? 'red' : 'green'}}>Gain: {item.gain.toFixed(2)}</strong>;
          }
          const gainLimit = trade.gainLimit.toFixed(2);
          const lossLimit = trade.lossLimit.toFixed(2);
          const openingPrice = trade.openingPrice.toFixed(2);
          return (
            <li key={index} title={`Trade ID: ${trade._id}`}>
              {`${trade.symbol} Entry: ${openingPrice}, Current Price: ${price}, `}{gl}, Qty: {trade.quantity},
              GainLimit: ${gainLimit},
              LossLimit: ${lossLimit}
            </li>
          );
        })
        }
      </ol>
    </>
  );
}

export default ActiveTradesView;