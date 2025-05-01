# Email Services Architecture

## Overview

The platform's email system consists of three primary services that work together to provide comprehensive email functionality:

1. **Gmail Service**: Integrates with Gmail API for sending, receiving, and syncing emails 
2. **SMTP Service**: Provides generic SMTP protocol support for various email providers
3. **Message Service**: Converts emails to internal message format and manages storage

## Communication Architecture

The services communicate with each other through a message queue system using specific topics for different operations.

## Message Flow

1. **EmailFullSync**: Triggered when a user connects an email account or requests
   a full sync. Both Gmail and SMTP services listen to this topic to perform
   full synchronization of the respective accounts.

2. **EmailNewMessage**: Carries new messages that need to be processed and stored.
   The Message service consumes this topic to convert emails to internal format
   and store them in the database.

3. **Provider-specific topics**: Handle provider-specific operations:
   - Gmail: Push notifications, watch operations, etc.
   - SMTP: Delivery status notifications, etc.

## Service Responsibilities

- **Gmail Service**: Handles Gmail API integration, listens for push notifications,
  performs history-based synchronization, and sends outbound messages via Gmail.

- **SMTP Service**: Manages SMTP protocol connections, sends emails via SMTP servers,
  and handles SMTP-specific features like delivery status notifications.

- **Message Service**: Consumes email data from Gmail and SMTP services, converts
  it to a standard internal format, and stores it in the database. Handles the
  presentation layer for email clients.

## Protocol Considerations

### IMAP for Email Synchronization

IMAP (Internet Message Access Protocol) is well-suited for synchronizing email messages with a local database:

**Advantages of IMAP for Synchronization:**
- **Designed for synchronization**: Unlike POP3, IMAP is specifically designed to keep messages on the server and allow multiple clients to access them.
- **Selective synchronization**: Can fetch only headers first, then specific messages as needed.
- **Efficient updates**: Supports fetching only new messages since last sync using UIDs.
- **Flag synchronization**: Can track read/unread status, flagged messages, etc.
- **Folder structure**: Preserves folder structure from the email server.
- **Wide compatibility**: Works with almost all email providers (Gmail, Outlook, Yahoo, etc.)
- **IDLE support**: Some servers support IMAP IDLE for real-time notifications.

**Implementation Considerations:**
- Implement incremental sync using UIDs (Unique Identifiers) to avoid re-downloading all messages.
- Use connection pooling for efficient resource usage when syncing multiple accounts.
- Consider implementing the CONDSTORE extension for optimizing changes in message flags.
- Handle disconnections and resuming sync gracefully.

**Comparison to Other Approaches:**
- **Gmail API**: More features for Gmail-specific functionality, but limited to Gmail.
- **POP3**: Only suitable for one-way downloads, not true synchronization.
- **Exchange/EWS**: Better for Microsoft-specific environments but more complex.
- **Graph API**: Modern API for Microsoft services but requires newer authentication.

For a comprehensive email solution, consider implementing both:
1. IMAP for general email provider compatibility
2. Provider-specific APIs (like Gmail API) for enhanced features when available

## Queue Topic Details

### EmailFullSync
- **Description**: Used to trigger complete synchronization of email accounts
- **Producers**: User interfaces requesting sync, scheduler for periodic sync
- **Consumers**: Gmail service, SMTP service
- **Payload example**:
  ```json
  {
    "accountId": "user123",
    "provider": "gmail",
    "credentials": {...},
    "options": { "includeAttachments": true }
  }
  ```

### EmailNewMessage
- **Description**: Notifies about new messages that need processing
- **Producers**: Gmail service, SMTP service, IMAP service
- **Consumers**: Message service
- **Payload example**:
  ```json
  {
    "accountId": "user123",
    "provider": "gmail",
    "messages": [
      { "id": "msg1", "headers": {...}, "body": {...}, "attachments": [...] }
    ]
  }
  ```