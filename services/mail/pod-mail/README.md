# Mail Service

## Overview

The Mail Service is responsible for sending emails using SMTP or SES transfer. 
It supports sending emails with multiple recipients, along with optional CC, BCC, and HTML content.

### Configuration

Environment variables should be set to configure the Mail Service:
- `PORT`: The port on which the mail service listens for incoming HTTP requests.

Settings for SMTP or SES email service should be specified, simultaneous use of both protocols is not supported

SMTP settings:
- `SMTP_HOST`: Hostname of the SMTP server used for sending emails.
- `SMTP_PORT`: Port number of the SMTP server.
- `SMTP_USERNAME`: Username for authenticating with the SMTP server. Refer to your SMTP server documentation for the appropriate format.
- `SMTP_PASSWORD`: Password for authenticating with the SMTP server. Refer to your SMTP server documentation for the appropriate format.

SES settings:
- `SES_ACCESS_KEY`: AWS SES access key for authentication.
- `SES_SECRET_KEY`: AWS SES secret key for authentication.
- `SES_REGION`: AWS SES region where your SES service is hosted.

### Running the Service

Add .env file to the root of the project with the following content to add integration with fake SMTP server:
```
PORT=8097
SMTP_HOST="mail.smtpbucket.com"
SMTP_PORT=8025 
```
To use the real SMTP server it is required to register an account in some email service provider and specify settings and credentials for it.

Start the service locally using:
```bash
rushx run-local
```

The service will run and listen for incoming requests on the configured port.

## API Endpoints

### POST /send

Send an email message.

#### Request Body

- `to`: Required. String or array of strings containing recipient email addresses.
- `text`: Required. String containing the plain text message body.
- `subject`: Required. String containing the email subject.
- `html`: Optional. String containing HTML message body.
- `from`: Optional. Sender's email address.

#### Response

- `200 OK` on success.
- `400 Bad Request` if required fields are missing.
