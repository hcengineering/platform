# Pod Gmail Service

A service that provides Gmail integration capabilities for the Hardcore Engineering Platform. This service handles Gmail authentication, message synchronization, and workspace management.

## Overview

The pod-gmail service is responsible for:
- Managing Gmail client connections
- Synchronizing emails across workspaces
- Handling user authentication and token management
- Providing Gmail integration features for the platform

## Prerequisites

- Node.js 16 or higher
- Gmail API credentials
- Hardcore Engineering Platform dependencies

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
- Create a `.env` file with necessary credentials
- Configure Gmail API credentials

## Example .env Configuration

Below is an example `.env` file for running the service locally:

```env
PORT=8093
ACCOUNTS_URL="http://127.0.0.1:3000"
SECRET="secret"
WATCH_TOPIC_NAME="test"
Credentials={"web":{"client_id":"get_from_your_gmail_account","client_secret":"get_from_your_gmail_account","redirect_uris":["http://localhost:8088/signin/code"]}}
MINIO_ENDPOINT="localhost"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
KVS_URL="http://localhost:8098"
```

Make sure to replace the values with your actual credentials and configuration.

## Development

### Running Locally

```bash
rushx run-local
```

### Building

```bash
rushx build
```

### Testing

```bash
rushx test
```

## Docker Support

The service can be built using Docker:

```bash
# Build Docker image
rushx docker:build
```

## Configuration

The service requires the following configurations:
- Gmail API credentials
- Workspace-specific settings
- Rate limiting configurations

## API Integration

The service integrates with:
- Gmail API for email operations
- Hardcore Engineering Platform core services
- Server core components

## Dependencies

### Core Dependencies
- @hcengineering/core
- @hcengineering/server-core
- @hcengineering/server-client
- @hcengineering/server-token
- @hcengineering/gmail

### External Dependencies
- googleapis
- google-auth-library
- express
- cors

## License

This project is licensed under the Eclipse Public License, Version 2.0. See the LICENSE file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## Support

For support, please contact the Hardcore Engineering team or open an issue in the repository.
