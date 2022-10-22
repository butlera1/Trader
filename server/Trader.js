import {Email} from 'meteor/email';
import {GetOrders, GetPriceForOptions, PlaceModeledTrade, PlaceOrder} from './TDAApi/TDAApi';
import {Users} from './collections/users';
import dayjs from 'dayjs';

const tenSeconds = 10000;

function clearInterval(timerHandle){
  if (timerHandle) {
    Meteor.clearInterval(timerHandle);
  }
  return null;
}

/**
 * Given an hour number 0-23 and minutes, this returns a dayjs object that is that time in New York times zone.
 * This assumes that any time zone differences from where the code is running and New York is in hours and single
 * digits at that.
 *
 * @param hour
 * @param minute
 * @returns {dayjs.Dayjs}
 */
function GetNewYorkTimeAt(hour,minute){
  const currentLocalTime = new Date();
  const currentNYTime = new Date(currentLocalTime.toLocaleString('en-US', {timeZone: 'America/New_York'}));
  const timeZoneDifference = currentNYTime.getHours() - currentLocalTime.getHours();
  const currentTimeZoneOffset = currentLocalTime.getTimezoneOffset()/60;
  const nyTimeZoneOffsetFromCurrentTimeZone = currentTimeZoneOffset - timeZoneDifference;
  const amPm = hour > 11 ? 'PM' : 'AM';
  const newYorkTimeAtGivenhourAndMinuteText = `${dayjs().format('YYYY-MM-DD')}, ${hour}:${minute}:00 ${amPm} GMT-0${nyTimeZoneOffsetFromCurrentTimeZone}00`;
  return dayjs(newYorkTimeAtGivenhourAndMinuteText);
}

function MonitorTradeToCloseItOut(userId, openingPrice, closingOrder, options) {
  let timerHandle = null;
  const {
    percentGain,
    percentLoss,
    accountNumber,
    emailAddress,
    phone,
    hours,
    minutes,
  } = Users.findOne(userId)?.services?.traderSettings;
  const gainLimit = openingPrice - openingPrice * percentGain;
  const lossLimit = openingPrice + openingPrice * percentLoss;
  const earlyExitTime = GetNewYorkTimeAt(hours, minutes);
  timerHandle = Meteor.setInterval(async () => {
    try {
      // Read the trades value.
      const {currentPrice, quoteTime} = await GetPriceForOptions(userId, options);
      if (currentPrice === Number.NaN) {
        console.log('MonitorTradeToCloseItOut: Failed to get a valid currentPrice. Try again next timeout.');
        return;
      }
      const isEndOfDay = dayjs(earlyExitTime).isBefore(quoteTime);
      const isClose = (currentPrice <= gainLimit) || (currentPrice >= lossLimit) || isEndOfDay;
      const msg = `Watching: $${openingPrice - currentPrice}.`;
      console.log(msg);
      if (isClose) {
        timerHandle = clearInterval(timerHandle);
        const closeOrderId = await PlaceOrder(userId, accountNumber, closingOrder);
      }
    } catch (ex) {
      timerHandle = clearInterval(timerHandle);
      // We have an emergency if this happens send communications.
      // TODO (AWB) Need a mail service set into MAIL_URL env var for the following to work.
      const emailOptions = {
        to: emailAddress,
        from: 'spockab@gmail.com',
        subject: `TRADER EXCEPTION: ${ex.toString()}`,
        text: `Trader has an exception in MonitorTradeToCloseItOut.\n\n--Trader System`
      };
      Email.send(emailOptions);
      // Send SMS to mobile
    }
  }, tenSeconds);
}

function calculateFillPrice(order) {
  const isBuyMap = {};
  let price = 0;
  // Define isBuyMap, so we know which legId is buy or a sell.
  order.orderLegCollection.forEach((item) => {
    isBuyMap[item.legId] = item.instruction.startsWith('BUY') ? true : false;
  });
  // For all the executed legs, calculate the final price.
  order.orderActivityCollection.forEach((item) => {
    item.executionLegs.forEach((leg) => {
      if (isBuyMap[leg.legId]) {
        price = price - leg.price;
      } else {
        price = price + leg.price;
      }
    });
  });
  return price;
}

async function WaitForOrderCompleted(userId, accountNumber, orderId) {
  return new Promise(async (resolve, reject) => {
    let timerHandle = null;
    let counter = 0;
    timerHandle = Meteor.setInterval(async () => {
      const order = await GetOrders(userId, accountNumber, orderId);
      if (order.status === 'FILLED') {
        Meteor.clearInterval(timerHandle);
        resolve(calculateFillPrice(order));
      }
      counter++;
      if (counter === 10) {
        Meteor.clearInterval(timerHandle);
        reject(`Order ${orderId} has failed to fill within the desired time.`);
      }
    }, 2000);
  });
}

function catchError(reason) {
  const when = dayjs();
  const msg = `PerformTradeForAllUsers failed with user ${user.username} at ${when.format('dd-mm-mmmm HH:MM:SS')}. Exception: ${ex}`;
  console.error(msg);
}

async function PerformTradeForAllUsers() {
  const users = Meteor.users.find().fetch();
  users.forEach((async (user) => {
    const tradeSettings = user.services.tradeSettings || {};
    if (tradeSettings.isTrading) {
      try {
        const {openingOrderId, closingOrder, options} = await PlaceModeledTrade(tradeSettings).catch(catchError);
        const openingPrice = await WaitForOrderCompleted(tradeSettings.accountNumber, openingOrderId);
        if (openingPrice) {
          MonitorTradeToCloseItOut(user._id, openingPrice, closingOrder, options);
        }
      } catch (ex) {
        const when = dayjs();
        const msg = `PerformTradeForAllUsers failed with user ${user.username} at ${when.format('dd-mm-mmmm HH:MM:SS')}. Exception: ${ex}`;
        console.error(msg);
      }
    }
  }).catch(catchError));
}

export {WaitForOrderCompleted, MonitorTradeToCloseItOut, GetNewYorkTimeAt};