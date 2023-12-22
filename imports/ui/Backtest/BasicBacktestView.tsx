import React from "react";
import Backtests from "../../Collections/Backtests";
import {useTracker} from 'meteor/react-meteor-data';

export function BasicBacktestView() {
    const [count, setCount] = React.useState(0);

    useTracker(() => {
        const rec = Backtests.findOne('btExample');
        if (rec && rec?.summary?.resultsPerDay) {
            setCount(rec?.summary?.resultsPerDay.length ?? 0);
            console.log('summary', rec?.summary);
        }
    }, [Backtests]);

    return (
        <div>
            <h1>Basic Backtest {count}</h1>
        </div>
    )
}