import React, { useState } from 'react';

const tdaLoginUrl = 'https://auth.tdameritrade.com/auth?response_type=code&redirect_uri=https://localhost/traderOAuthCallback&client_id=PFVYW5LYNPRZH6Y1ZCY5OTBGINDLZDW8@AMER.OAUTHAP'
const options = {
    method: 'GET',
    mode: 'no-cors'
};
export const LoginToTda = () => {

    const [code, setCode] = useState('');
    React.useEffect(() => {
        fetch(tdaLoginUrl, options)
            .then(data=>{
                console.log('Fetch worked.');
                setCode('fetch completed');
            })
            .catch(error=> console.log(error))
    },[]);

    return (
        <div>
            <p>Logging in ...</p>
            <p>Code: {code}</p>
        </div>
    );
};
