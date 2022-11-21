import SibApiV3Sdk from 'sib-api-v3-sdk';
import twilio from 'twilio';
// @ts-ignore
import process from 'process';
import {LogData} from './collections/Logs';
import {atob} from 'buffer';

const twilioPW = atob('YjNjYzU4NDE3YjMxYTJiMjE3YmRmNTEwM2Y4MjhmZjk=');
const twilioID = atob('QUMwNWQ0NjNiMjk2NjYyNjVjNzg1ZDgxYWMwOGI3MWYwYg==');
const sendInBlueAppKey = atob('eGtleXNpYi1mOTRjMzQxMDg4OWQzODQxMDllZTAwZjAyMTM4MTAyNDJmYzFiZWU1NzI4YTc3OGExNDkxYzBhYWEzOGVmNDRjLWRKeUFjbVBYTlQ1WXhCVVM=');

// smtps://USERNAME:PASSWORD@HOST:PORT
// bat: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
//
// smtps://bat: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@smtp-relay.sendinblue.com:587
// The following was created via this pattern:
// smtps://sendInBlueAppName:APIKey@smtp-relay.sendinblue.com:587
// const smtpsUrl = atob(`c210cHM6Ly9iYXQ6eGtleXNpYi1mOTRjMzQxMDg4OWQzODQxMDllZTAwZjAyMTM4MTAyNDJmYzFiZWU1NzI4YTc3OGExNDkxYzBhYWEzOGVmNDRjLWRKeUFjbVBYTlQ1WXhCVVNAc210cC1yZWxheS5zZW5kaW5ibHVlLmNvbTo1ODc=`);

console.log(`stuff`);

SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = sendInBlueAppKey;

function SendEmail(toEmail, subject, text){
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.textContent = text;
  sendSmtpEmail.sender = {"name":"Arch","email":"archb@comcast.net"};
  sendSmtpEmail.to = [{"email":toEmail,"name":toEmail}];

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.sendTransacEmail(sendSmtpEmail).then(function() { }, function(error) {
    LogData(null, `Failed SendInBlue email message: ${error}`);
  });
}

function SendOutInfo(text: string, subject: string, to: string, phone: string) {
  if (to) {
    SendEmail(to, subject, text);
  }
  if (phone) {
    // @ts-ignore
    const client = new twilio(twilioID, twilioPW);
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
