import XLSX from 'xlsx';
import writeCSV from 'write-csv';

/**
 * This file is run a separate application within WebStorm. It is used to perform some backtesting.
 *
 */


function seeIfTraded({isLong, low, high, entryPrice, targetLoss, targetGain, forceClose}) {
  const checkLowFirst = Math.random() > 0.5;
  let gainLoss = null;
  if (isLong) {
    if (checkLowFirst) {
      if (low <= entryPrice - targetLoss || forceClose) {
        gainLoss = -targetLoss;
      } else if (high >= entryPrice + targetGain) {
        gainLoss = targetGain;
      }
    } else {
      if (high >= entryPrice + targetGain || forceClose) {
        gainLoss = targetGain;
      } else if (low <= entryPrice - targetLoss) {
        gainLoss = -targetLoss;
      }
    }
  } else {
    if (checkLowFirst) {
      if (low <= entryPrice - targetGain || forceClose) {
        gainLoss = targetGain;
      } else if (high >= entryPrice + targetLoss) {
        gainLoss = -targetLoss;
      }
    } else {
      if (high >= entryPrice + targetLoss || forceClose) {
        gainLoss = -targetLoss;
      } else if (low <= entryPrice - targetGain) {
        gainLoss = targetGain;
      }
    }
  }
  return gainLoss;
}

function performTrade(data, startingIndex, isLong, trades, targetGain, targetLoss) {
  if (startingIndex >= data.length) { return startingIndex; }
  let index = startingIndex;
  let entryPrice = null;
  let gainLoss = null;
  do {
    const [date, open, high, low, close, volume, TimeStamp, DateTime_ET, Time_ET] = data[index];
    if (entryPrice === null) {
      entryPrice = open;
    }
    // Force the closing of the trade if EOD or end of data.
    const forceClose = Time_ET === '16:00:00' || index === data.length - 1;
    gainLoss = seeIfTraded({isLong, low, high, entryPrice, targetLoss, targetGain, forceClose});
    index++;
  } while (gainLoss === null);

  let totalGainLoss = (trades.length > 0 ? trades[trades.length-1].totalGainLoss : 0) + gainLoss;
  let totalWins = (trades.length > 0 ? trades[trades.length-1].totalWins : 0) + (gainLoss > 0 ? 1 : 0);
  let totalLosses = (trades.length > 0 ? trades[trades.length-1].totalLosses : 0) + (gainLoss < 0 ? 1 : 0);

  // In the .slice below, the index will already be incremented by 1 from the loop above, so we use it as is.
  const trade = {
    data: data.slice(startingIndex, index),
    gainLoss,
    entryPrice,
    targetGain,
    targetLoss,
    totalGainLoss,
    totalWins,
    totalLosses,
  };
  trades.push(trade);
  return index;
}

function DailyLongAndShort({data, longTargetGain, longTargetLoss, shortTargetGain, shortTargetLoss, longResults, shortResults}) {
  let longIndex = 1;
  let shortIndex = 1;
  const longTrades = [];
  const shortTrades = [];
  while (longIndex < data.length && shortIndex < data.length) {
    longIndex = performTrade(data, longIndex, true, longTrades, longTargetGain, longTargetLoss);
    shortIndex = performTrade(data, shortIndex, false, shortTrades, shortTargetGain, shortTargetLoss);
  }

  const longResult = {
    gainLoss: longTrades[longTrades.length-1].totalGainLoss,
    successRate: ((longTrades[longTrades.length-1].totalWins / longTrades.length)*100),
    longTargetGain,
    longTargetLoss,
    wins: longTrades[longTrades.length-1].totalWins,
    losses: longTrades[longTrades.length-1].totalLosses,
  };
  const shortResult = {
    gainLoss: shortTrades[shortTrades.length-1].totalGainLoss,
    successRate: ((shortTrades[shortTrades.length-1].totalWins / shortTrades.length)*100),
    shortTargetGain,
    shortTargetLoss,
    wins: shortTrades[shortTrades.length-1].totalWins,
    losses: shortTrades[shortTrades.length-1].totalLosses,
  };

  longResults.push(longResult);
  shortResults.push(shortResult);
}

// Time_ET is new york time and is only values between 9:30:00 and 16:00:00.
const workbook = XLSX.readFile('./Filtered_SPY-October-20 .xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet, {header: 1});

function loop() {
  let longResults = [];
  let shortResults = [];
  for (let gain = 0.5; gain < 4.0; gain = gain + 0.1) {
    for (let loss = 0.5; loss < 4.0; loss = loss + 0.1) {
      const longTargetGain = gain;  // Fix dollar amount
      const longTargetLoss = loss; // Fix dollar amount
      const shortTargetGain = gain + 1;  // Fix dollar amount
      const shortTargetLoss = loss; // Fix dollar amount
      DailyLongAndShort({
        data,
        longTargetGain,
        longTargetLoss,
        shortTargetGain,
        shortTargetLoss,
        longResults,
        shortResults
      });
    }
  }
  longResults = longResults.sort((a, b) => a.gainLoss > b.gainLoss ? -1 : 1);
  shortResults = shortResults.sort((a, b) => a.gainLoss > b.gainLoss ? -1 : 1);
  writeCSV('longResults.csv', longResults);
  writeCSV('shortResults.csv', shortResults);
}

loop();
export default DailyLongAndShort;