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
- MongoDB
- Gmail API credentials
- Hardcore Engineering Platform dependencies

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
- Create a `.env` file with necessary credentials
- Ensure MongoDB connection string is properly set
- Configure Gmail API credentials

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
- MongoDB connection settings
- Gmail API credentials
- Workspace-specific settings
- Rate limiting configurations

## API Integration

The service integrates with:
- Gmail API for email operations
- MongoDB for data persistence
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
- mongodb
- express
- cors

## License

This project is licensed under the Eclipse Public License, Version 2.0. See the LICENSE file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## Support

For support, please contact the Hardcore Engineering team or open an issue in the repository. 