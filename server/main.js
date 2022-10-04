import {Meteor} from 'meteor/meteor';
import {Trades} from './collections/trades';
import {Tokens} from './collections/tokens';
import './collections/straddleData';
import './collections/stockData';
import {GetOrders} from './TDAApi';
import {GetDaysStraddleValues} from './Backtest/DataAccess';
import dayjs from 'dayjs';
import {StraddleDailyOpenCloseModelWithLimits} from './Backtest/DailyModel';
import writeCsv from 'write-csv';

if (!Trades.findOne({_id: 'test'})) {
  console.log('Adding junk record for testing');
  Trades.insert({_id: 'test', junk: 'junk text for testing'});
}

const tokenCount = Tokens.find().fetch().length;
console.log(`Total token records: ${tokenCount}`);
if (tokenCount) {
  const orders = await GetOrders('63375e36de6617fcb387e155', '755541528');
  console.log(orders?.securitiesAccount?.orderStrategies);
}

// Listen to incoming HTTP requests (can only be used on the server).
WebApp.connectHandlers.use('/traderOAuthCallback', (req, res, next) => {
  res.writeHead(200);
  res.end(`Hello. Received new access code: \n${decodeURI(req.query?.code)}`);
});
// TDALogin();

const results = await StraddleDailyOpenCloseModelWithLimits('QQQ', dayjs('2022-01-03'), 0.6, 20.00, 5, 180);
writeCsv('../../../../../../result.csv', results.dailyResults);

// Load Meteor Methods
Meteor.methods(
  {
    TestOptions: GetDaysStraddleValues,
  }
);