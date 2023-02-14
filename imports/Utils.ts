import ITradeSettings from './Interfaces/ITradeSettings';

function CalculateTotalFees(tradeSettings) {
  if (tradeSettings.totalFees) return tradeSettings.totalFees;
  const {quantity, commissionPerContract = 0, legs} = tradeSettings;
  return quantity * commissionPerContract * 2 * legs.length;
}

function CalculateGain(tradeSettings, currentPrice) {
  const {openingPrice, quantity} = tradeSettings;
  const totalFees = CalculateTotalFees(tradeSettings);
  let possibleGain = (Math.abs(openingPrice) - currentPrice) * 100.0 * quantity;
  if (openingPrice > 0) {
    // We are in a long position.
    possibleGain = (Math.abs(currentPrice) - openingPrice) * 100.0 * quantity;
  }
  return possibleGain - (totalFees ?? 0);
}

function CalculateLimitsAndFees(tradeSettings: ITradeSettings) {
  const {
    percentGain,
    percentLoss,
  } = tradeSettings;
  let {openingPrice} = tradeSettings;

  tradeSettings.totalFees = CalculateTotalFees(tradeSettings);

  if (tradeSettings.useShortOnlyForLimits) {
    if (openingPrice > 0) {
      openingPrice = Math.abs(tradeSettings.openingShortOnlyPrice);
    } else {
      openingPrice = -Math.abs(tradeSettings.openingShortOnlyPrice);
    }
  }
  // If long entry, the openingPrice is positive (debit) and negative if short (credit).
  if (openingPrice > 0) {
    tradeSettings.gainLimit = Math.abs(tradeSettings.openingPrice + openingPrice * percentGain);
    tradeSettings.lossLimit = Math.abs(tradeSettings.openingPrice - openingPrice * percentLoss);
  } else {
    tradeSettings.gainLimit = Math.abs(tradeSettings.openingPrice - openingPrice * percentGain);
    tradeSettings.lossLimit = Math.abs(tradeSettings.openingPrice + openingPrice * percentLoss);
  }
}

export {CalculateGain, CalculateTotalFees, CalculateLimitsAndFees};