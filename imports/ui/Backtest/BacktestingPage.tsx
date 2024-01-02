import React from "react";
import RangesEditor from "./RangesEditor.tsx";
import {BasicBacktestView} from "./BasicBacktestView.tsx";
import BacktestPatternsEditor from "./BacktestPatternsEditor.tsx";

export function BacktestingPage() {
  return (
    <div>
      <BacktestPatternsEditor/>
      <BasicBacktestView/>
    </div>
  )
}