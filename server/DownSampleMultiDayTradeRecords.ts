import {GetLiveTrades} from "./BackgroundPolling.ts";
import ITradeSettings, {IPrice} from "../imports/Interfaces/ITradeSettings.ts";
import {Trades} from "./collections/Trades.js";

function downSampleTrade(liveTrade: ITradeSettings) {
  const today = new Date();
  const startingIndex = liveTrade.monitoredPrices.findIndex((price) => {
    return (price.whenNY.getDate()===today.getDate() &&
      price.whenNY.getMonth()===today.getMonth() &&
      price.whenNY.getFullYear()===today.getFullYear());
  });
  const samplesFromToday = liveTrade.monitoredPrices.splice(startingIndex);
  const chunkSize = Math.floor(samplesFromToday.length / 10);
  let index = 0;
  while (index < samplesFromToday.length) {
    const chunk = samplesFromToday.slice(index, index + chunkSize);
    const avgPrice = chunk.reduce((sum, sample) => sum + sample.price, 0) / chunk.length;
    const avgGain = chunk.reduce((sum, sample) => sum + sample.gain, 0) / chunk.length;
    const newPrice: IPrice = {
      ...chunk[0].whenNY,
      price: avgPrice,
      gain: avgGain,
    };
    liveTrade.monitoredPrices.push(newPrice);
    index += chunk.length;
  }
  Trades.upsert(liveTrade._id, {$set: {monitoredPrices: liveTrade.monitoredPrices}});
}

function DownSampleMultiDayTradeRecords() {
  console.log('Running: DownSampleMultiDayTradeRecords');
  const liveTrades = GetLiveTrades();
  liveTrades.forEach((liveTrade: ITradeSettings) => {
    if (liveTrade.isMultiDay && liveTrade.monitoredPrices.length > 0) {
      downSampleTrade(liveTrade);
    }
  });
}

export { DownSampleMultiDayTradeRecords };
