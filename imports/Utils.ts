function CalculateGain(tradeSettings, currentPrice) {
  const {openingPrice, quantity, totalFees} = tradeSettings;
  let possibleGain = (Math.abs(openingPrice) - currentPrice) * 100.0 * quantity;
  if (openingPrice > 0) {
    // We are in a long position.
    possibleGain = (Math.abs(currentPrice) - openingPrice) * 100.0 * quantity;
  }
  return possibleGain - (totalFees ?? 0);
}

export {CalculateGain};