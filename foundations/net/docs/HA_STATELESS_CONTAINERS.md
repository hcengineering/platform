# High Availability (HA) Stateless Container Support

This feature enables Huly Network to support stateless containers with automatic failover capabilities, allowing you to build highly available services that must ensure only one instance is active at any given time.

## ⚠️ Important: Network Service Limitation

The **Network Server** (central coordinator) does NOT support HA:

- ❌ Network service must run as a single instance only
- ❌ No clustering or multiple network servers allowed
- ❌ Network service is a single point of failure

**However**, agents and containers DO support HA through stateless container registration:

- ✅ Multiple agents can register the same container UUID
- ✅ Automatic failover when primary agent fails
- ✅ Leader election without external coordination

This document covers HA for **agents and containers only**.

## Overview

The stateless container feature allows multiple agents to register pre-existing containers with the same UUID. The network will automatically:

1. **Choose the first agent** that registers a container UUID
2. **Reject other agents** attempting to register the same UUID
3. **Enable automatic failover** when the active container is closed/terminated
4. **Allow standby agents to re-register** and take over when the primary fails

This provides a simple yet effective HA mechanism for services that require leader election or single-instance guarantees.

## Key Concepts

### Stateless Containers

Unlike regular containers that are created on-demand by agents, stateless containers are:

- **Pre-existing**: The container instance already exists before registration
- **HA-aware**: Multiple agents can have the same container UUID ready to register
- **Failover-capable**: When removed, standby agents automatically attempt to take over

### Registration Flow

```
Agent 1 (Primary)              Network                 Agent 2 (Standby)
     |                           |                            |
     |-- Register UUID-001 ----->|                            |
     |<-- Accepted ---------------|                            |
     |                           |<--- Register UUID-001 -----|
     |                           |---- Rejected (duplicate) ->|
     |                           |                            |
     | (container terminates)    |                            |
     |-- Unregister UUID-001 --->|                            |
     |                           |-- Event: Removed --------->|
     |                           |                            |
     |                           |<--- Re-register UUID-001 --|
     |                           |---- Accepted ------------->|
```

## API Reference

### AgentImpl Methods

#### `addStatelessContainer(uuid, kind, endpoint, container)`

Add a stateless container to the agent for registration.

**Parameters:**

- `uuid: ContainerUuid` - The container UUID (must be consistent across HA agents)
- `kind: ContainerKind` - The container type/kind
- `endpoint: ContainerEndpointRef` - The endpoint reference for this container
- `container: Container` - The actual container instance

**Example:**

```typescript
// Note: For production code, prefer using serveAgent() on the client
// This example uses AgentImpl directly for educational purposes
const agent = new AgentImpl('my-agent-id', containerFactories)

// Add a stateless container
agent.addStatelessContainer(
  'service-001' as ContainerUuid,
  'my-service' as ContainerKind,
  'service://host/service-001' as ContainerEndpointRef,
  myServiceContainer
)

// Register the agent - network will accept or reject the stateless container
await client.register(agent)
```

#### `removeStatelessContainer(uuid)`

Remove a stateless container from tracking (called when rejected by network).

**Parameters:**

- `uuid: ContainerUuid` - The container UUID to remove

### Network Behavior

The network's `register()` method now:

1. **Checks for UUID conflicts**: If a container UUID already exists and is owned by a different agent, the new registration is rejected
2. **Returns containers to shutdown**: The response includes UUIDs that should be terminated
3. **Broadcasts events**: Container removal events trigger standby agents to attempt re-registration

## Usage Example

### Basic HA Setup

```typescript
import { AgentImpl, containerUuid, TickManagerImpl } from '@hcengineering/network-core'
import { createNetworkClient, NetworkAgentServer } from '@hcengineering/network-client'

// Shared service UUID across all HA instances
const SHARED_SERVICE_UUID = 'my-ha-service-001' as ContainerUuid

// Note: For production code, prefer using serveAgent() on the client
// This example uses AgentImpl directly for educational purposes

// Create Agent 1 (Primary)
const agent1 = new AgentImpl('agent-1', containerFactories)
agent1.addStatelessContainer(
  SHARED_SERVICE_UUID,
  'ha-service',
  'service://agent-1/service-001',
  primaryServiceContainer
)

// Create Agent 2 (Standby)
const agent2 = new AgentImpl('agent-2', containerFactories)
agent2.addStatelessContainer(
  SHARED_SERVICE_UUID,
  'ha-service',
  'service://agent-2/service-001',
  standbyServiceContainer
)

// Connect to network
const client = createNetworkClient('localhost:3737')
await client.waitConnection()

// Register both agents
await client.register(agent1) // Will be accepted
await client.register(agent2) // Will be rejected for SHARED_SERVICE_UUID

// When agent1's container is terminated, agent2 will automatically take over
```

### Monitoring and Failover

```typescript
// Listen for container events to monitor failover
client.onUpdate(async (event) => {
  for (const containerEvent of event.containers) {
    if (containerEvent.container.uuid === SHARED_SERVICE_UUID) {
      switch (containerEvent.event) {
        case NetworkEventKind.added:
          console.log('Container registered:', containerEvent.container.agentId)
          break
        case NetworkEventKind.removed:
          console.log('Container removed - failover in progress')
          break
        case NetworkEventKind.updated:
          console.log('Container updated')
          break
      }
    }
  }
})

// Simulate failover by terminating primary container
await agent1.terminate(SHARED_SERVICE_UUID)
// Agent2 will automatically re-register and take over (after ~100ms delay)
```

## Implementation Details

### Agent Side

1. **Stateless containers are tracked separately** in `AgentImpl.statelessContainers` map
2. **Included in registration** when `list()` is called
3. **Activated on success** - moved to active containers if accepted by network
4. **Terminated on rejection** - removed from tracking if network rejects

### Network Side

1. **First-wins policy** - The first agent to register a UUID owns it
2. **Rejection mechanism** - Returns UUIDs to shutdown for conflicting registrations
3. **Event broadcasting** - Sends removal events when containers are terminated
4. **Automatic cleanup** - Orphaned containers are tracked and cleaned up

### Client Side

1. **Event handling** - Monitors for container removal events
2. **Automatic re-registration** - Triggers re-registration when stateless container is removed
3. **Throttling** - Small delay (100ms) to prevent thundering herd
4. **Transparent to users** - Failover happens automatically

## Use Cases

### 1. Leader Election

Implement leader election without external coordination services:

```typescript
class LeaderService implements Container {
  constructor(readonly clusterId: string) {
    // Initialize leader-specific resources
  }

  async request(operation: string, data?: any): Promise<any> {
    // Handle leader operations
    return { isLeader: true, clusterId: this.clusterId }
  }
}

// All nodes register with same UUID, first one becomes leader
const leaderUuid = `cluster-${clusterId}-leader` as ContainerUuid
agent.addStatelessContainer(leaderUuid, 'leader', endpoint, new LeaderService(clusterId))
```

### 2. Singleton Services

Ensure only one instance of a service runs across the cluster:

```typescript
class DatabaseMigrationService implements Container {
  async request(operation: string): Promise<any> {
    if (operation === 'migrate') {
      // Only one instance will run migrations
      await this.runMigrations()
    }
  }
}

const migrationUuid = 'db-migration-singleton' as ContainerUuid
agent.addStatelessContainer(migrationUuid, 'migration', endpoint, migrationService)
```

### 3. Active-Standby Databases

Implement active-standby database pattern:

```typescript
class DatabaseReplica implements Container {
  private isActive = false

  async onActivation(): Promise<void> {
    // Promote standby to active
    this.isActive = true
    await this.promoteToMaster()
  }

  async request(operation: string): Promise<any> {
    if (!this.isActive) {
      throw new Error('Standby replica - read-only')
    }
    return await this.executeQuery(operation)
  }
}
```

## Configuration

### Failover Delay

The default failover delay is 100ms. You can adjust this by modifying the timeout in `NetworkClientImpl.onEvent()`:

```typescript
setTimeout(() => {
  this.doRegister(agent).catch(...)
}, 100) // Adjust this value
```

### Container Cleanup

Orphaned containers are automatically cleaned up based on the timeout settings. Configure via:

```typescript
const tickManager = new TickManagerImpl(1) // 1 second tick
const network = new NetworkImpl(tickManager)
```

## Testing

See the complete example in `examples/ha-stateless-container-example.ts`:

```bash
# Start the network server
cd pods/network-pod
rushx dev

# In another terminal, run the example
npx ts-node examples/ha-stateless-container-example.ts
```

## Limitations

1. **No split-brain protection**: The network itself doesn't prevent split-brain scenarios if network partitions occur
2. **Eventually consistent**: There may be brief periods during failover where no instance is active
3. **No state transfer**: Stateless containers don't automatically transfer state between instances
4. **Single network dependency**: All agents must connect to the same Huly Network instance

## Best Practices

1. **Use meaningful UUIDs**: Make container UUIDs descriptive and consistent across deployments
2. **Implement health checks**: Containers should implement proper `ping()` methods
3. **Handle rejection gracefully**: Standby agents should be prepared to be rejected
4. **Monitor events**: Always subscribe to container events to track failover
5. **Test failover**: Regularly test failover scenarios in non-production environments
6. **Set appropriate timeouts**: Configure timeouts based on your SLA requirements

## Troubleshooting

### Problem: Standby agent not taking over

**Solution**: Check that:

- Both agents are properly connected to the network
- Container UUIDs match exactly
- Standby agent is properly listening for removal events
- Network event broadcasting is working

### Problem: Both agents think they're active

**Solution**: This indicates a split-brain scenario. Ensure:

- All agents connect to the same network instance
- Network connections are stable
- No network partitions exist

### Problem: Failover takes too long

**Solution**:

- Reduce the failover delay in `NetworkClientImpl.onEvent()`
- Implement faster health checks
- Use shorter network timeout values

## See Also

- [Container API](../packages/core/src/containers.ts)
- [Agent Implementation](../packages/core/src/agent.ts)
- [Network Implementation](../packages/core/src/network.ts)
- [Client Implementation](../packages/client/src/client.ts)
