# Huly Network Examples

This directory contains comprehensive examples demonstrating various aspects of the Huly Virtual Network.

## Quick Start

Before running any example, make sure you have:

1. Built the project:

   ```bash
   node common/scripts/install-run-rush.js build
   ```

2. Either start a standalone network server:

   ```bash
   cd pods/network-pod && rushx dev
   ```

   Or let the example start its own network server (most examples do this).

3. Run an example:
   ```bash
   npx ts-node examples/01-basic-container-request-response.ts
   ```

## Examples

### 01 - Basic Container with Request/Response

**File**: `01-basic-container-request-response.ts`

Learn the fundamentals of creating containers that handle various operations. This example shows:

- Container implementation basics
- Request/response pattern
- State management within containers
- Proper lifecycle management

**Use case**: Simple data storage service, key-value stores, stateful services

---

### 02 - Event Broadcasting

**File**: `02-event-broadcasting.ts`

Demonstrates real-time event broadcasting to multiple connected clients. Features:

- Multiple clients connecting to the same container
- Broadcasting events to all connected clients
- Chat room implementation
- Connection lifecycle management

**Use case**: Chat systems, real-time notifications, collaborative editing, live dashboards

---

### 03 - Multi-Tenant Container Management

**File**: `03-multi-tenant.ts`

Shows how to build multi-tenant applications with isolated workspaces. Includes:

- Per-tenant container isolation
- Label-based container selection
- Tenant-specific data management
- User and document management per tenant

**Use case**: SaaS applications, workspace management, multi-tenant platforms

---

### 04 - Complete Production Setup

**File**: `04-complete-production-setup.ts`

A comprehensive production-ready example with:

- Multiple redundant agents for high availability
- Health monitoring and metrics collection
- Event monitoring for observability
- Graceful shutdown handling
- Signal handling (SIGTERM, SIGINT)
- Error handling and logging

**Use case**: Production deployments, enterprise systems, mission-critical services

---

### 05 - Error Handling and Retry Logic

**File**: `05-error-handling-retry.ts`

Advanced error handling patterns including:

- Exponential backoff retry logic
- Timeout handling
- Graceful degradation with fallbacks
- Circuit breaker pattern
- Concurrent request handling with error isolation

**Use case**: Unreliable networks, external service integration, fault-tolerant systems

---

### Custom Timeout Example

**File**: `custom-timeout-example.ts`

Shows how to configure different timeouts for various environments:

- Development vs production timeouts
- Connection timeout configuration
- Keep-alive timeout settings

**Use case**: Environment-specific configuration, debugging, performance tuning

---

### High Availability (HA) Stateless Container Example

**File**: `ha-stateless-container-example.ts`

Demonstrates automatic failover with stateless containers:

- Multiple agents competing for the same container UUID
- Automatic leader election
- Failover when primary fails
- Standby agents taking over automatically

**Use case**: Leader election, active-passive HA, single-instance services with failover

## Example Categories

### For Beginners

Start with these examples to learn the basics:

1. `01-basic-container-request-response.ts`
2. `custom-timeout-example.ts`

### For Application Developers

Build real applications with these patterns:

1. `02-event-broadcasting.ts` - Real-time features
2. `03-multi-tenant.ts` - SaaS applications

### For DevOps/Production

Production-ready patterns:

1. `04-complete-production-setup.ts` - Full production setup
2. `05-error-handling-retry.ts` - Robust error handling
3. `ha-stateless-container-example.ts` - High availability

## Running Examples

### Run a single example:

```bash
npx ts-node examples/01-basic-container-request-response.ts
```

### Run with custom network host:

Most examples connect to `localhost:3737` by default. To use a different host:

```typescript
const client = createNetworkClient('your-host:3737')
```

### Debug mode:

Run with longer timeouts for debugging:

```bash
NODE_ENV=development npx ts-node examples/01-basic-container-request-response.ts
```

## Common Patterns

### Container Implementation Template

```typescript
import type { Container, ContainerUuid, ClientUuid } from '@hcengineering/network-core'

class MyContainer implements Container {
  constructor(readonly uuid: ContainerUuid) {}

  async request(operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    switch (operation) {
      case 'myOperation':
        return { success: true, result: 'data' }
      default:
        return { success: false, error: 'Unknown operation' }
    }
  }

  async ping(): Promise<void> {}
  async terminate(): Promise<void> {}

  connect(clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void {}
  disconnect(clientId: ClientUuid): void {}
}
```

### Client Usage Template

```typescript
import { createNetworkClient } from '@hcengineering/network-client'

const client = createNetworkClient('localhost:3737')
await client.waitConnection(5000)

const containerRef = await client.get('my-service' as any, {})
const result = await containerRef.request('myOperation', { data: 'value' })

await containerRef.close()
await client.close()
```

### Agent Setup Template

```typescript
import { createAgent } from '@hcengineering/network-client'

const { agent, server } = await createAgent('localhost:3738', {
  'my-service': async (options) => {
    const uuid = options.uuid ?? generateUuid()
    const container = new MyContainer(uuid)
    return {
      uuid,
      container,
      endpoint: `my-service://host/${uuid}` as any
    }
  }
})

// Agent server is already started, no need to call server.start()
```

## Troubleshooting

### Connection refused

- Ensure the network server is running on the specified port
- Check firewall settings
- Verify the correct host and port are being used

### Container not found

- Ensure the agent is registered with the network
- Check that the container kind matches what the agent supports
- Verify the agent is still alive (check agent health)

### Timeout errors

- Increase timeout values for debugging: `createNetworkClient('host:port', 3600)`
- Check network connectivity
- Verify services are responding to ping/health checks

### Type errors in examples

The examples use dynamic container kinds (strings) which may show TypeScript errors. This is expected and doesn't affect functionality. In production, define proper types:

```typescript
type MyContainerKind = 'my-service' as ContainerKind
```

## Additional Resources

- [Main README](../README.md) - Full project documentation
- [HA Stateless Containers](../docs/HA_STATELESS_CONTAINERS.md) - Detailed HA documentation
- [Quick Start HA](../docs/QUICKSTART_HA.md) - 5-minute HA guide
- [API Reference](../README.md#-api-reference) - Complete API documentation

## Contributing Examples

To contribute a new example:

1. Create a new file: `XX-descriptive-name.ts`
2. Include comprehensive comments and documentation
3. Follow the existing example structure
4. Add entry to this README
5. Test thoroughly
6. Submit a pull request

Example template structure:

- Header comment with description and usage
- Imports
- Container implementation (if applicable)
- Main function with clear sections
- Proper cleanup
- Export reusable components

---

**Need help?** Open an issue on GitHub or check the main documentation.
