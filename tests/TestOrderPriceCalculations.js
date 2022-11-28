function CalculateGrossOrderBuysAndSells(order) {
  const isBuyMap = {};
  let price = 0;
  // Define isBuyMap, so we know which legId is buy or sell.
  order.orderLegCollection.forEach((item) => {
    isBuyMap[item.legId] = item.instruction.startsWith('BUY');
  });
  let buyPrice = 0;
  let sellPrice = 0;
  // For all the executed legs, calculate the final price.
  order.orderActivityCollection?.forEach((item) => {
    item.executionLegs.forEach((leg) => {
      if (isBuyMap[leg.legId]) {
        buyPrice += (leg.price * leg.quantity);
      } else {
        sellPrice -= (leg.price * leg.quantity);
      }
    });
  });
  // For trigger orders, we recurse into the triggered childOrders
  if (order.childOrderStrategies) {
    order.childOrderStrategies.forEach((childOrder) => {
      const subCalcs = CalculateGrossOrderBuysAndSells(childOrder);
      buyPrice += subCalcs.buyPrice;
      sellPrice += subCalcs.sellPrice;
    });
  }
  return {buyPrice, sellPrice};
}

function CalculateFilledOrderPrice(order){
  const grossPrices = CalculateGrossOrderBuysAndSells(order);
  const finalPrice = grossPrices.buyPrice/order.quantity + grossPrices.sellPrice/order.quantity;
  return finalPrice;
}

const order = {
  "session": "NORMAL",
  "duration": "DAY",
  "orderType": "MARKET",
  "complexOrderStrategyType": "STRADDLE",
  "quantity": 10,
  "filledQuantity": 10,
  "remainingQuantity": 0,
  "requestedDestination": "AUTO",
  "destinationLinkName": "CDRG",
  "orderLegCollection": [
    {
      "orderLegType": "OPTION",
      "legId": 1,
      "instrument": {
        "assetType": "OPTION",
        "cusip": "0QQQ..KS20285000",
        "symbol": "QQQ_112822C285",
        "description": "QQQ Nov 28 2022 285.0 Call",
        "type": "VANILLA",
        "putCall": "CALL",
        "underlyingSymbol": "QQQ"
      },
      "instruction": "BUY_TO_CLOSE",
      "positionEffect": "CLOSING",
      "quantity": 10
    },
    {
      "orderLegType": "OPTION",
      "legId": 2,
      "instrument": {
        "assetType": "OPTION",
        "cusip": "0QQQ..WS20285000",
        "symbol": "QQQ_112822P285",
        "description": "QQQ Nov 28 2022 285.0 Put",
        "type": "VANILLA",
        "putCall": "PUT",
        "underlyingSymbol": "QQQ"
      },
      "instruction": "BUY_TO_CLOSE",
      "positionEffect": "CLOSING",
      "quantity": 10
    }
  ],
  "orderStrategyType": "TRIGGER",
  "orderId": 9855642354,
  "cancelable": false,
  "editable": false,
  "status": "FILLED",
  "enteredTime": "2022-11-28T16:42:53+0000",
  "closeTime": "2022-11-28T16:42:53+0000",
  "tag": "AA_butlera1",
  "accountId": 755541528,
  "orderActivityCollection": [
    {
      "activityType": "EXECUTION",
      "activityId": 49833899945,
      "executionType": "FILL",
      "quantity": 3,
      "orderRemainingQuantity": 0,
      "executionLegs": [
        {
          "legId": 1,
          "quantity": 3,
          "mismarkedQuantity": 0,
          "price": 0.75,
          "time": "2022-11-28T16:42:53+0000"
        },
        {
          "legId": 2,
          "quantity": 3,
          "mismarkedQuantity": 0,
          "price": 0.81,
          "time": "2022-11-28T16:42:53+0000"
        }
      ]
    },
    {
      "activityType": "EXECUTION",
      "activityId": 49833899942,
      "executionType": "FILL",
      "quantity": 3,
      "orderRemainingQuantity": 3,
      "executionLegs": [
        {
          "legId": 1,
          "quantity": 3,
          "mismarkedQuantity": 0,
          "price": 0.75,
          "time": "2022-11-28T16:42:53+0000"
        },
        {
          "legId": 2,
          "quantity": 3,
          "mismarkedQuantity": 0,
          "price": 0.81,
          "time": "2022-11-28T16:42:53+0000"
        }
      ]
    },
    {
      "activityType": "EXECUTION",
      "activityId": 49833899939,
      "executionType": "FILL",
      "quantity": 4,
      "orderRemainingQuantity": 6,
      "executionLegs": [
        {
          "legId": 1,
          "quantity": 4,
          "mismarkedQuantity": 0,
          "price": 0.75,
          "time": "2022-11-28T16:42:53+0000"
        },
        {
          "legId": 2,
          "quantity": 4,
          "mismarkedQuantity": 0,
          "price": 0.81,
          "time": "2022-11-28T16:42:53+0000"
        }
      ]
    }
  ],
  "childOrderStrategies": [
    {
      "session": "NORMAL",
      "duration": "DAY",
      "orderType": "MARKET",
      "complexOrderStrategyType": "STRANGLE",
      "quantity": 10,
      "filledQuantity": 10,
      "remainingQuantity": 0,
      "requestedDestination": "AUTO",
      "destinationLinkName": "DFIN",
      "orderLegCollection": [
        {
          "orderLegType": "OPTION",
          "legId": 1,
          "instrument": {
            "assetType": "OPTION",
            "cusip": "0QQQ..KS20288000",
            "symbol": "QQQ_112822C288",
            "description": "QQQ Nov 28 2022 288.0 Call",
            "type": "VANILLA",
            "putCall": "CALL",
            "underlyingSymbol": "QQQ"
          },
          "instruction": "SELL_TO_CLOSE",
          "positionEffect": "CLOSING",
          "quantity": 10
        },
        {
          "orderLegType": "OPTION",
          "legId": 2,
          "instrument": {
            "assetType": "OPTION",
            "cusip": "0QQQ..WS20281000",
            "symbol": "QQQ_112822P281",
            "description": "QQQ Nov 28 2022 281.0 Put",
            "type": "VANILLA",
            "putCall": "PUT",
            "underlyingSymbol": "QQQ"
          },
          "instruction": "SELL_TO_CLOSE",
          "positionEffect": "CLOSING",
          "quantity": 10
        }
      ],
      "orderStrategyType": "SINGLE",
      "orderId": 9855642355,
      "cancelable": false,
      "editable": false,
      "status": "FILLED",
      "enteredTime": "2022-11-28T16:42:53+0000",
      "closeTime": "2022-11-28T16:42:53+0000",
      "tag": "AA_butlera1",
      "accountId": 755541528,
      "orderActivityCollection": [
        {
          "activityType": "EXECUTION",
          "activityId": 49833899953,
          "executionType": "FILL",
          "quantity": 10,
          "orderRemainingQuantity": 0,
          "executionLegs": [
            {
              "legId": 1,
              "quantity": 10,
              "mismarkedQuantity": 0,
              "price": 0.04,
              "time": "2022-11-28T16:42:53+0000"
            },
            {
              "legId": 2,
              "quantity": 10,
              "mismarkedQuantity": 0,
              "price": 0.03,
              "time": "2022-11-28T16:42:53+0000"
            }
          ]
        }
      ]
    }
  ]
};

const price = CalculateFilledOrderPrice(order);
console.log('Price: ', price);
