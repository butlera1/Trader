// const { TDAmeritrade } = require('@knicola/tdameritrade')
import {TDAmeritrade} from '@marknokes/tdameritrade';

function TDALogin() {
    const td = new TDAmeritrade({
        apiKey: 'PFVYW5LYNPRZH6Y1ZCY5OTBGINDLZDW8',
        redirectUri: 'https://localhost/traderOAuthCallback',
        sslKey: 'assets/app/selfsigned.key',
        sslCert: 'assets/app/selfsigned.crt',
    })

    // event will fire once the local web server
    // is ready for the oauth2 authorization.
    td.on('login', url => {
        // use this to print the td oauth2 url to console
        // or to open the url directly in the browser.
        console.log(`Login has happened. Returned URL is: ${url}`)
    })

    // event will fire every time the token is renewed.
    td.on('token', token => {
        // use this to know when a new access token is
        // issued or to save the token to a file.
        console.log(`Token update has happened with new token of: ${token}`)
    })

    // an all-in-one entry point which will determine
    // whether authorization is required or, if the
    // access token expired, whether to renew it.
    td.login().then(async () => {
        const {candles} = await td.getPriceHistory('SPY', {period: 1, periodType: 'month', frequency: 1, frequencyType: 'daily'})
        console.log(`SPY price history has been obtained with ${candles.length} items in the list. ${JSON.stringify(candles[0])}`)
        // const accounts = await td.getAccounts().catch(reason => console.log(reason));
        // console.log(`Accounts data:`, accounts)
    })
}

export default TDALogin;