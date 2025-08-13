# Pod Mail Worker

Pod Mail Worker is a service that provides bidirectional synchronization between Huly messages and email servers.

## Purpose

This service acts as a bridge between Huly's internal messaging system and external email infrastructure, enabling:

- **Incoming Email Processing**: Receives emails via MTA hooks and converts them into Huly messages
- **Outgoing Email Synchronization**: Processes Huly messages and sends them as emails
- **Queue Processing**: Handles asynchronous message processing via Kafka queues

## Key Components

### MTA Hook Handler (`/mta-hook`)
- Receives incoming emails from mail transfer agents
- Parses email content (plain text, HTML, attachments)
- Converts emails to Huly message format
- Handles email threading via In-Reply-To headers

### Mail Worker
- Processes queued mail operations
- Manages workspace client connections
- Handles bulk email processing operations

## Configuration

Key environment variables:

- `PORT`: Service port (default: 4050)
- `WORKSPACE_URL`: Target Huly workspace URL
- `ACCOUNTS_URL`: Huly accounts service URL
- `KVS_URL`: Key-value store URL for thread mapping
- `QUEUE_CONFIG`: Kafka queue configuration
- `HOOK_TOKEN`: Authentication token for MTA hooks
- `IGNORED_ADDRESSES`: Comma-separated list of email addresses to ignore
- `MAIL_SIZE_LIMIT`: Maximum email size (default: 50mb)

## API Endpoints

### POST /mta-hook
Receives incoming emails from mail transfer agents.

**Headers:**
- `x-hook-token`: Authentication token (if configured)

**Body:** MTA message format with envelope and message data

**Response:** Always returns `200 OK` with `{ action: 'accept' }` to prevent email bounces

## Dependencies

- **Kafka**: Message queue for asynchronous processing
- **KVS**: Key-value store for thread mapping persistence
- **Workspace API**: Huly workspace integration
- **Account Client**: User and workspace management

## Development

```bash
# Install dependencies
rush update

# Build
rushx build

# Run tests
rushx test

# Start development server
rushx run-local

```

## Deployment

The service is designed to run as a containerized application with the following requirements:

- Network access to Huly workspace APIs
- Connection to Kafka message queues
- Access to key-value store for persistence
- Ability to receive HTTP requests from mail servers
