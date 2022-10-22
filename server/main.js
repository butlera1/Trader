import {Meteor} from 'meteor/meteor';
import './collections/straddleData';
import './collections/stockData';
import {
  SetUserAccessInfo,
  BuyStock,
  GetAccessToken,
  GetATMOptionChains,
  GetOrders,
  PlaceModeledTrade,
  SellStraddle
} from './TDAApi/TDAApi';
import './SeedUser';
import dayjs from 'dayjs';
import {GetNewYorkTimeAt} from './Trader';

// Listen to incoming HTTP requests (can only be used on the server).
WebApp.connectHandlers.use('/traderOAuthCallback', (req, res, next) => {
  res.writeHead(200);
  res.end(`Trader received a redirect callback. Received new access code: \n${decodeURI(req.query?.code)}`);
});

Meteor.methods({
  SetUserAccessInfo,
  GetAccessToken,
  GetOrders,
  BuyStock,
  SellStraddle,
  GetATMOptionChains,
  PlaceModeledTrade,
});


const hour = 12;
const minute = 30;

const nyTime = GetNewYorkTimeAt(hour, minute);

console.log(`NewYork Time: ${nyTime.format('hh:mm:ss')} in LHC.`);



// TODO (AWB) 1) Place orders for short straddle (maybe others)
// TODO (AWB) 2) Track an order looking for value (particularly value of a straddle).
// TODO (AWB) 3) Buy back (market) a short straddle to close when the straddle:
//      - reaches a price based on percentage of original short sell value.
//      - reaches a price based on stop loss percentage of original short sell value.
//      - reaches a certain time of the day.
