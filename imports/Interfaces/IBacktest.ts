import {IBacktestSummary} from "./ITradeSettings.ts";

interface IBacktest {
    _id?: string,
    isDone?: boolean,
    totalTradesCount?: number,
    totalSummariesCount?: number,
    summaries?: IBacktestSummary[],
    estimatedDaysCount?: number,
    estimatedSummariesCount?: number,
    isOkToRun?: boolean,
}

const DefaultIBacktest: IBacktest = {
    isDone: false,
    totalTradesCount: 0,
    totalSummariesCount: 0,
    summaries: [],
    estimatedDaysCount: 0,
    estimatedSummariesCount: 0,
    isOkToRun: true,
};

export {IBacktest, DefaultIBacktest};