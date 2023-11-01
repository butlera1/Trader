import {Dayjs} from 'dayjs';

interface IRanges {
  recordId: string,
  startGain: number,
  endGain: number,
  gainIncrement: number,

  startLoss: number,
  endLoss: number,
  lossIncrement: number,

  startGainLimitPrerunAllowedDurationSeconds: number,
  endGainLimitPrerunAllowedDurationSeconds: number,
  gainLimitPrerunAllowedDurationSecondsIncrement: number,

  startDate: Dayjs,
  endDate: Dayjs,

  entryHours: number[],
  exitHours: number[],

}

export {IRanges as default} ;