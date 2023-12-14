import {Dayjs} from 'dayjs';

interface IRanges {
    tradeSettingsSetId: string,

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
}

const DefaultRanges: IRanges = {
    tradeSettingsSetId: '',
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
};

export {IRanges as default, DefaultRanges} ;