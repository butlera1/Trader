import SibApiV3Sdk from 'sib-api-v3-sdk';
// import twilio from 'twilio';
import _ from 'lodash';
import {LogData} from './collections/Logs';
import {atob} from 'buffer';

const pw = atob('YjNjYzU4NDE3YjMxYTJiMjE3YmRmNTEwM2Y4MjhmZjk=');
const Id = atob('QUMwNWQ0NjNiMjk2NjYyNjVjNzg1ZDgxYWMwOGI3MWYwYg==');
const key = atob('eGtleXNpYi1mOTRjMzQxMDg4OWQzODQxMDllZTAwZjAyMTM4MTAyNDJmYzFiZWU1NzI4YTc3OGExNDkxYzBhYWEzOGVmNDRjLU9qd05MMnIwYkFIWFNGcEs=');

SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = key;

function SendEmail(toEmail, subject, text) {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.textContent = text;
    sendSmtpEmail.sender = {'name': 'Arch', 'email': 'archb@comcast.net'};
    sendSmtpEmail.to = [{'email': toEmail, 'name': toEmail}];

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.sendTransacEmail(sendSmtpEmail).then(function () {
    }, function (error) {
      LogData(null, `Failed SendInBlue email message: ${error}`);
    });
  } catch (e) {
    LogData(null, `Failed attempting SendInBlue email message: ${e}`);
  }
}

function SendOutInfo(text: string, subject: string, to?: string, phone?: string) {
  if (!_.isEmpty(to)) {
    // SendEmail(to, subject, text);
  }
  if (!_.isEmpty(phone)) {
    // const client = new twilio(Id, pw);
    // client.messages
    //   .create({
    //     body: text,
    //     to: phone,
    //     from: '+14793703254', // Twilio validated phone number
    //   })
    //   .then()
    //   .catch(reason => LogData(null, `Failed Twilio message: ${reason}`));
  }
}

function SendTextToAdmin(text: string, subject: string) {
  SendEmail(text, subject, subject);
}

export default SendOutInfo;
export {SendTextToAdmin};
