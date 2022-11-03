function StuffLegParams(leg, symbol, quantity, instruction) {
  leg.quantity = quantity;
  leg.instrument.symbol = symbol;
  leg.instruction = instruction;
}

export default StuffLegParams;  