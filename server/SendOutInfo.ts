// @ts-ignore
import {Email} from "meteor/email";
import twilio from 'twilio';
// @ts-ignore
import process from 'process';
import {LogData} from './collections/Logs';

function SendOutInfo(text: string, subject: string, to: string, phone: string) {
    // TODO (AWB) Need a mail service set into MAIL_URL env var for the following to work.
    const emailOptions = {
        to,
        from: 'spockab@gmail.com',
        subject,
        text,
    };
    if (to) {
        Email.send(emailOptions);
    }
    if (phone && process.env.smsID && process.env.smsPW) {
        // @ts-ignore
        const client = new twilio(process.env.smsID, process.env.smsPW);
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
