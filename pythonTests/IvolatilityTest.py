import ivolatility as ivol

ivol.setLoginParams(apiKey={your_api_key})
# OR:
ivol.setLoginParams(username={your_IVol_username}, password={your_IVol_password})

getOptionsChain = ivol.setMethod('/equities/option-series')
optionsChain = getOptionsChain(symbol='SPX', expFrom='2023-10-03', expTo='2023-10-04', strikeFrom=3000, strikeTo=3010, callPut='C')
print(optionsChain)
#optionsChain.to_csv('optionsChain.csv', header=True)

getMarketData = ivol.setMethod('/equities/rt/options-rawiv')
marketData = getMarketData(symbols=optionsChain['optionSymbol'])
print(marketData)
#marketData.to_csv('marketData.csv', header=True, index=False)