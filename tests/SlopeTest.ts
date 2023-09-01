import {CalculateUnderlyingPriceSlopeAngle} from '../imports/Utils';

function TestSlopeAngle(){
  const monitoredPrices = [];
  for (let i = 0; i < 100; i++) {
    monitoredPrices.push({underlyingPrice: i});
  }
  const prerunSlopeValue = {totalSamples: 10, samplesToAverage: 2, desiredSlopeAngle: 20, numberOfDesiredAnglesInARow: 3};
  let angle = CalculateUnderlyingPriceSlopeAngle(prerunSlopeValue, monitoredPrices);
  console.log(`angle: ${angle}`);
}

export default TestSlopeAngle;