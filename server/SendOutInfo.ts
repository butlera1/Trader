import SibApiV3Sdk from 'sib-api-v3-sdk';
import twilio from 'twilio';
import _ from 'lodash';
// @ts-ignore
import process from 'process';
import {LogData} from './collections/Logs';
import {atob} from 'buffer';

const pw = atob('YjNjYzU4NDE3YjMxYTJiMjE3YmRmNTEwM2Y4MjhmZjk=');
const Id = atob('QUMwNWQ0NjNiMjk2NjYyNjVjNzg1ZDgxYWMwOGI3MWYwYg==');
const key = atob('eGtleXNpYi1mOTRjMzQxMDg4OWQzODQxMDllZTAwZjAyMTM4MTAyNDJmYzFiZWU1NzI4YTc3OGExNDkxYzBhYWEzOGVmNDRjLU9qd05MMnIwYkFIWFNGcEs=');

SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = key;

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
  if (!_.isEmpty(to)) {
    SendEmail(to, subject, text);
  }
  if (!_.isEmpty(phone)) {
    // @ts-ignore
    const client = new twilio(Id, pw);
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

function SendTextToAdmin(text:string, subject: string){
  SendOutInfo(text, subject, null, '+19523938719');
}

export default SendOutInfo;
export {SendTextToAdmin};
