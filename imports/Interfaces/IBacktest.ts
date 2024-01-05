import {IBacktestSummary} from "./ITradeSettings.ts";

interface IBacktest {
    _id?: string,
    backtestingIsOff?: boolean,
    isDone?: boolean,
    totalTradesCount?: number,
    totalSummariesCount?: number,
    summaries?: IBacktestSummary[],
    estimatedDaysCount?: number,
    estimatedSummariesCount?: number,
    isOkToRun?: boolean,
    isLoadingHistoricalData?: boolean,
    loadingHistoricalData?: string,
}

const DefaultIBacktest: IBacktest = {
    isDone: true,
    backtestingIsOff: false,
    totalTradesCount: 0,
    totalSummariesCount: 0,
    summaries: [],
    estimatedDaysCount: 0,
    estimatedSummariesCount: 0,
    isOkToRun: true,
};

export {IBacktest, DefaultIBacktest};