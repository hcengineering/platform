# Mail Service

## Overview

The Mail Service is responsible for sending emails using configured SMTP or SES configurations. 
It supports sending emails with multiple recipients, along with optional CC, BCC, and HTML content.

### Configuration

Environment variables should be set to configure the Mail Service:
- `PORT`: The port on which the mail service listens for incoming HTTP requests.
- `DEFAULT_PROTOCOL`: (optional) The default protocol to use (e.g., HTTP or HTTPS) for external communications.
Settings for SMTP or SES email service must be specified.
SES settings:
- `SES_ACCESS_KEY`: AWS SES access key for authentication.
- `SES_SECRET_KEY`: AWS SES secret key for authentication.
- `SES_REGION`: AWS SES region where your SES service is hosted.
SMTP settings:
- `SMTP_HOST`: Hostname of the SMTP server used for sending emails.
- `SMTP_PORT`: Port number of the SMTP server.
- `SMTP_USERNAME`: Username for authenticating with the SMTP server. Refer to your SMTP server documentation for the appropriate format.
- `SMTP_PASSWORD`: Password for authenticating with the SMTP server. Refer to your SMTP server documentation for the appropriate format.

### Running the Service

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
