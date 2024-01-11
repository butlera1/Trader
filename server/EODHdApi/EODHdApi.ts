import {fetch} from "meteor/fetch";
import {LogData} from "../collections/Logs.ts";
import ConvertTickDataToCandle from "./ConvertTickDataToCandle.ts";
import ICandle from "../../imports/Interfaces/ICandle.ts";
import {GetNewYorkTimeAt} from "../../imports/Utils.ts";

//const api_token = '659d6a2358e427.28183992';
const api_token = 'demo';

async function GetOneDayOfTickData(on: Date, symbol: string): Promise<ICandle[] | null> {
  try {
    const from = GetNewYorkTimeAt(9, 30).year(on.getFullYear()).month(on.getMonth()).date(on.getDate()).second(0).millisecond(0).toDate();
    const to = GetNewYorkTimeAt(16, 0).year(on.getFullYear()).month(on.getMonth()).date(on.getDate()).second(0).millisecond(0).toDate();
    console.log(`UTC: ${from.toUTCString()} to ${to.toUTCString()}`);
    const fromText = (from.getTime() / 1000).toString(10);
    const toText = (to.getTime() / 1000).toString(10);
    const queryParams = new URLSearchParams({
      api_token,
      s: symbol,
      from: fromText,
      to: toText,
      limit: '10001',
      fmt: 'json',
    });
    const url = `https://eodhd.com/api/ticks/?${queryParams}`;
    const options = {method: 'GET'};
    const response = await fetch(url, options);
    if (response.status!==200) {
      LogData(null, `EODhd.GetTickData fetch returned: ${response.status} ${response.statusText} ${response}.`);
      return null;
    }
    const data = await response.json();
    if (data?.empty) {
      return null;
    }
    return ConvertTickDataToCandle(data);
  } catch (error) {
    LogData(null, `EODhd.GetTickData: `, error);
    return null;
  }
}


export default GetOneDayOfTickData;