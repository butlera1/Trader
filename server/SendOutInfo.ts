// @ts-ignore
import {Email} from "meteor/email";
import twilio from 'twilio';

function SendOutInfo(text: string, subject: string, to: string = 'spockab@gmail.com', phone: string = '+19523938719') {
    // TODO (AWB) Need a mail service set into MAIL_URL env var for the following to work.
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
        const client = new twilio('AC05d463b29666265c785d81ac08b71f0b', 'e372aea5b9351cf2780549c215449352');
        client.messages
          .create({
              body: text,
              to: phone,
              from: '+14793703254', // Twilio validated phone number
          });
    }
}

export default SendOutInfo;
