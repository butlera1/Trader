import {Dayjs} from 'dayjs';

interface IRanges {
    recordId: string,

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

    startDate: Dayjs,
    endDate: Dayjs,

    entryHours: number[],
    exitHours: number[],
}

const DefaultRanges: IRanges = {
    recordId: '',
    startGain: 1,
    endGain: 1,
    gainIncrement: 1,
    gainIsDollar: false,

    startLoss: 1,
    endLoss: 1,
    lossIncrement: 1,
    lossIsDollar: false,

    startGainLimitPrerunAllowedDurationSeconds: 180,
    endGainLimitPrerunAllowedDurationSeconds: 180,
    gainLimitPrerunAllowedDurationSecondsIncrement: 60,

    startDate: null,
    endDate: null,

    entryHours: [9],
    exitHours: [10],
};

export {IRanges as default, DefaultRanges} ;