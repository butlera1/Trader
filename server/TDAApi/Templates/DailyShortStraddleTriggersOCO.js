const ShortStraddleTiggersOCOTemplate = {
  'orderStrategyType': 'TRIGGER',
  'session': 'NORMAL',
  'duration': 'DAY',
  'orderType': 'MARKET',
  'complexOrderStrategyType': 'STRADDLE',
  'orderLegCollection': [
    {
      "instrument": {
        "assetType": "OPTION",
        "symbol": "XYZ_011819P45"
      },
      "instruction": "SELL_TO_OPEN",
      "quantity": 1
    },
    {
      "instrument": {
        "assetType": "OPTION",
        "symbol": "XYZ_011819C45"
      },
      "instruction": "SELL_TO_OPEN",
      "quantity": 1
    }
  ],
  'childOrderStrategies': [
    {
      'orderStrategyType': 'OCO',
      'childOrderStrategies': [
        {
          'orderStrategyType': 'SINGLE',
          'session': 'NORMAL',
          'duration': 'DAY',
          'orderType': 'LIMIT',
          'price': 15.27,
          'complexOrderStrategyType': 'STRADDLE',
          'orderLegCollection': [
            {
              "instrument": {
                "assetType": "OPTION",
                "symbol": "XYZ_011819P45"
              },
              "instruction": "BUY_TO_CLOSE",
              "quantity": 1
            },
            {
              "instrument": {
                "assetType": "OPTION",
                "symbol": "XYZ_011819C45"
              },
              "instruction": "BUY_TO_CLOSE",
              "quantity": 1
            }
          ]
        },
        {
          'orderStrategyType': 'SINGLE',
          'session': 'NORMAL',
          'duration': 'GOOD_TILL_CANCEL',
          'orderType': 'STOP',
          'stopPrice': 11.27,
          'orderLegCollection': [
            {
              'instruction': 'SELL',
              'quantity': 5,
              'instrument': {
                'assetType': 'EQUITY',
                'symbol': 'XYZ'
              }
            }
          ]
        }
      ]
    }
  ]
};
