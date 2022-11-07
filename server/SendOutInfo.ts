// @ts-ignore
import {Email} from "meteor/email";

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
    if (phone) {
        // TODO (AWB) Send SMS to mobile
        // Use phone here to send SMS messages.
        console.log(`Could be sms'ing to ${phone}`);
    }
}

export default SendOutInfo;
