interface IRanges {
  _id?: string,
  tradeSettingsSetId: string,
  isDefault?: boolean,
  name?: string,
  userId?: string,

  startGain: number,
  endGain: number,
  gainIncrement: number,
  gainIsDollar: boolean,

  startLoss: number,
  endLoss: number,
  lossIncrement: number,
  lossIsDollar: boolean,

  startGainLimitPrerunAllowedDurationSeconds: number,
  endGainLimitPrerunAllowedDurationSeconds: number,
  gainLimitPrerunAllowedDurationSecondsIncrement: number,

  startDate: Date,
  endDate: Date,

  entryHours: number[],
  exitHours: number[],

  countOnly: boolean, // Used to run backtest to get estimated trading days for the range settings.
  estimatedDaysCount: number, // Estimated trade days.
  estimatedSummariesCount: number, // Estimated summaries for the range settings.
}

function GetDefaultRanges():IRanges{
  return {
    tradeSettingsSetId: '',
    name: 'Default',
    isDefault: false,
    startGain: 1,
    endGain: 10,
    gainIncrement: 2,
    gainIsDollar: true,

    startLoss: 1,
    endLoss: 10,
    lossIncrement: 2,
    lossIsDollar: true,

    startGainLimitPrerunAllowedDurationSeconds: 180,
    endGainLimitPrerunAllowedDurationSeconds: 180,
    gainLimitPrerunAllowedDurationSecondsIncrement: 60,

    startDate: null,
    endDate: null,

    entryHours: [9],
    exitHours: [10],

    countOnly: true,
    estimatedDaysCount: 0,
    estimatedSummariesCount: 0,
  };
}

export {IRanges as default, GetDefaultRanges} ;