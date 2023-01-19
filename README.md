# Stock trading tool for TDAmeritrade API. Focused on daily option trading.

## Initial API call to get access code.
Go to the following link in a browser and log in using your TDA credentials. **NOTE: this link must include the client key!!!:**
```
https://auth.tdameritrade.com/auth?response_type=code&redirect_uri=https://localhost/traderOAuthCallback&client_id=8MXX4ODNOEKHOU0COANPEZIETKPXJRQZ%40AMER.OAUTHAP
```
After valid signing in, the system will attempt to redirect the URL and fail. In the failed URL will be en encrypted code. Copy everything in the URL after the "?code=" and take it to the following link to decode it.

```
https://www.url-encode-decode.com/
```
Then take the decoded information and paste it into the "Enter code here:" location in the option trader application and click the "Store Data" button.

Example output:
```
CJkc1hRW6/JbJI6WTy3/c7KdSUOD6sRJpbrOfwWYEf7N1pN6fd8l9GtFB2IeR1nGXJzxvWeumdL6rMCe61r/K0ro6U7TLYPkAWmMAO5nBWKyG3GkFw3ZsVNMgp2yEQ2xrbTEK1zyWSB4wTJbs+pBjxKhMfBKvrcSOVsKsi1t10CucLvk7dVKlY3/m5ECqzPH0AQ7LUG9oFwyAH1Yf5OX2yWh6VAqnbsFhOYAhS7ZhOg8qW8oHUMMxfLZAujg1FrxnMbi5acMpE4K9w/CYfD40slwLCr5Mc8SEKyh2BmyEuOIuLCTAGrJEMLGPkuZkSoXY26bT9+KWNWRlDAtAS/kS//b+0F28mtT3PMeYOdMOjBJRezH+HcjElD2td1gK0PGNomf8JtrY8iKLOkotmeB4k0uXa9iShXNyccrXcMQUKfrcK3eTnNDL0QwMeJ100MQuG4LYrgoVi/JHHvlDINOjqeGSboEhyLEhcN8JCPQf/ISichlnu3dWzOmRZqhNLzqmCkTBtjAQbbEx0wOf+yPiYL7jN+1le3RxlFsFPLDd2aJ5dtHOq1me7lwYpHnYEJcVjhKvolKBla23e7iLXlyh7WzurD3UZ5NBl575D7fI2TiUnEa4/MPkICwFqMteTXwhnPSDLbGTl08Mr3GtOLNbLUOm24ykTCPoNYuUQrs21GkBolof1eee2882xeVAHWMAE/alPa3LCK5ecxe5QrOX1ivO2nqgYHJfhU9+rxiXxMQ9CjbGbejJc8MBef6NFsjciE1sQB9CP9gz4ODQFkYUFj4CrUS0rjHAbn5DKtEv2s1zG5yHQTPiZgpOrNME6XeA5S2Wrr3au6Cb5jjFbU7EacAS2TT1cy23npBRx+Fq4S9BDFF9OL6KV2z98KH/WDotwd0cW2sqo0=212FD3x19z9sWBHDJACbC00B75E
```
## Making self-signed certs to be used within the TDAmeritrade API.

The following command was used (defined at https://www.npmjs.com/package/@marknokes/tdameritrade): 
```
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -out selfsigned.crt -keyout selfsigned.key \
-subj '/CN=localhost' -extensions EXT -config <( \
printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
```

## Steps to putting nginx as a https proxy frontend
See: https://imagineer.in/blog/https-on-localhost-with-nginx/ 

This article gives a walk through setting up of HTTPS protocol for localhost using NGINX in OSX (10.11.5).

Prerequisites:
1. openssl
   OSX by default comes with openssl.

$ openssl version
OpenSSL 0.9.8zh 14 Jan 2016
2. nginx
   Install:

$ brew install nginx
$ nginx -v
nginx version: nginx/1.10.1
3. a local server
   Start your local development server. (For eg: this can be just an index.html file with ‘hello world’ inside /local_website).

$ cd /local_website
$ python -m http.server 8000
4. [optional] Adding alias for local website
   Instead of accessing as localhost you can optionally provide an alias for your local website in /etc/hosts

127.0.0.1 local.website.dev



Setting Up HTTPS for localhost
Websites need an SSL certificate to work on HTTPS. Usually it is signed & issued by CAs (Certificate Authorities). We will generate a self-signed certificate for our local testing.


STEP 1: Generate Self-signed SSL Certificate
Openssl can generate a self-signed SSL certificate & private key pair with the following command (generated files will be in the current directory).

$ openssl req -x509 -sha256 -nodes -newkey rsa:2048 -days 365 -keyout localhost.key -out localhost.crt
This command will ask for the following info:

Country Name
State or Province Name
Locality Name
Organization Name
Organizational Unit Name
Common Name*
Email Address
Common Name value should be the domain name of your website. It is local.website.dev in our example.
If you have multiple subdomains, use a wildcard *.website.dev

The generated certificate will be in x509 container format with SHA256 signature algorithm, 2048bit RSA authentication key and is valid for 365 days.

[OPTIONAL]: If you want to view the contents of encoded certificate, do this:

$ openssl x509 -text -noout -in localhost.crt

STEP 2: Trust authority of the certificate
When browsers get the certificate from server, the authenticity is verified by checking with existing CAs. Browser has a list of trusted CAs by default, if the certificate issuer is not there, then browser will be showing a security warning ‘untrusted connection’.

Our generated certificate is self-signed, so browser will give security warning. In order to bypass that, we will manually verify the trust of certificate.

In OSX, you can do that in Keychain access as shown below: (or, open keychain access ui and add cerificate there).

$ sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /path/to/file/localhost.crt
Note: this will work only on chrome & safari, because those browsers check keychain access to get list of CAs. Firefox stores its own list of trusted CAs in the browser, so firefox will still throw the security error.


STEP 3: Configure & Reload nginx
Here is a sample nginx configuration you can make use of. Save its as nginx_custom.conf

nginx_custom.conf
```
events {}
http {
    upstream backend {
        server 127.0.0.1:8000;
    }
    server {
        server_name local.website.dev;
        rewrite ^(.*) https://local.website.dev$1 permanent;
    }
    server {
        listen               443;
        ssl                  on;
        ssl_certificate      /path/to/file/localhost.crt;
        ssl_certificate_key  /path/to/file/localhost.key;
        ssl_ciphers          HIGH:!aNULL:!MD5;
        server_name          local.website.dev;
        location / {
            proxy_pass  http://backend;
        }
    }
}

```
Start/reload nginx:

$ sudo nginx -c /path/to/file/nginx_custom.conf
$ sudo nginx -c /path/to/file/nginx_custom.conf -s reload

Final step
Access https://local.website.dev, you can see that little green padlock icon  in the address bar. Yes, your local website is on HTTPS now!
