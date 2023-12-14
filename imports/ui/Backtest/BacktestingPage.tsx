import React from "react";
import RangesEditor from "./RangesEditor.tsx";
import {BasicBacktestView} from "./BasicBacktestView.tsx";

export function BacktestingPage() {
  return (
    <div>
      <RangesEditor/>
      <BasicBacktestView/>
    </div>
  )
}