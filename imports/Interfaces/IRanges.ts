import {Dayjs} from 'dayjs';

interface IRanges {
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
}

export {IRanges as default} ;