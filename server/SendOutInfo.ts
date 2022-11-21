// @ts-ignore
import {Email} from "meteor/email";
import twilio from 'twilio';
// @ts-ignore
import process from 'process';
import {LogData} from './collections/Logs';
import {atob} from 'buffer';
const pw = atob('YjNjYzU4NDE3YjMxYTJiMjE3YmRmNTEwM2Y4MjhmZjk=');
const id = atob('QUMwNWQ0NjNiMjk2NjYyNjVjNzg1ZDgxYWMwOGI3MWYwYg==');

console.log(`stuff`);

function SendOutInfo(text: string, subject: string, to: string, phone: string) {
    const emailOptions = {
        to,
        from: 'spockab@gmail.com',
        subject,
        text,
    };
    if (to) {
        // Email.send(emailOptions);
    }
    if (phone) {
        // @ts-ignore
        const client = new twilio(id, pw);
        client.messages
          .create({
              body: text,
              to: phone,
              from: '+14793703254', // Twilio validated phone number
          })
          .then()
          .catch(reason => LogData(null, `Failed Twilio message: ${reason}`));
    }
}

export default SendOutInfo;
