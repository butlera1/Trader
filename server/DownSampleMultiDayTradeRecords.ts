import {GetLiveTrades} from "./BackgroundPolling.ts";
import ITradeSettings, {IPrice} from "../imports/Interfaces/ITradeSettings.ts";
import {Trades} from "./collections/Trades.js";

function downSampleTrade(liveTrade: ITradeSettings) {
  const today = new Date();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  const todayDate = today.getDate();

  const startingIndex = liveTrade.monitoredPrices.findIndex((price) => {
    return (price?.whenNY?.getDate()===todayDate &&
      price?.whenNY?.getMonth()===todayMonth &&
      price?.whenNY?.getFullYear()===todayYear);
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
