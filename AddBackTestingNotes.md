Notes on adding backtesting to the software.

 * Search for valid option data for a given date in order to find the desired DTE option set for making the buy/sell orders. See GetATMOptionChains in TDAApi.js. Resulting data must match TDA's so the order generation code (CreateOpenAndCloseOrders) works as is.
 * Adjust PlaceOpeningOrderAndMonitorToClose to place the order in mocked mode when backtesting.
 * The current date and time must be adjusted so that it is passed in.


Do a prerun based on time delay or slope of VWAP.


