import {fetch} from 'meteor/fetch';
import {Tokens} from './collections/tokens';

const options = {
    method: 'GET',
    headers: {
        Authorization: 'Bearer',
    }
};

export async function GetOrders(tokenId, accountNumber='755541528') {
    try {
        const record = Tokens.findOne({_id: tokenId});
        const url = `https://api.tdameritrade.com/v1/accounts/${accountNumber}?fields=orders`;
        options.headers.Authorization = `Bearer ${record?.access_token}`;
        const response = await fetch(url, options);
        return await response.json();
    } catch (error) {
        console.error(error);
        console.error(`TDAApi.GetOrders: tokenId:${tokenId}, accntNumber: ${accountNumber}`);
    }
}