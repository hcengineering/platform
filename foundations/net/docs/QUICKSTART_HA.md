# Quick Start: HA Stateless Containers

## ⚠️ Important: Network Service Limitation

The **Network Server** (central coordinator) does NOT support HA:

- ❌ Network service must run as a single instance
- ❌ No clustering or multiple network servers allowed
- ✅ Agents and containers DO support HA (explained below)

This guide covers HA for **agents and containers only**.

## 5-Minute Guide

### What is it?

A feature that lets multiple agents compete to manage the same container UUID. The first agent wins, and others automatically take over if it fails.

### When to use it?

- You need leader election
- You want only one instance of a service running
- You need automatic failover
- You want HA without external coordination services

### Basic Example

```typescript
import { AgentImpl } from '@hcengineering/network-core'
import { createNetworkClient, containerOnAgentEndpointRef } from '@hcengineering/network-client'

// 1. Create your container
class MyService implements Container {
  constructor(readonly uuid: ContainerUuid) {}

  async request(operation: string): Promise<any> {
    return { status: 'active', uuid: this.uuid }
  }

  async terminate(): Promise<void> {
    console.log('Service stopped')
  }

  // ... other required methods
}

// 2. Create agents with serveAgent (both will try to register same UUID)
const sharedUUID = 'my-service-001' as ContainerUuid

// Connect to network
const client = createNetworkClient('localhost:3737')
await client.waitConnection()

// Agent 1 (Primary) - uses serveAgent with stateless containers
await client.serveAgent(
  'localhost:3801',
  {}, // Container factories for dynamic containers
  (agentEndpoint) => {
    // Return stateless containers
    const service1 = new MyService(sharedUUID)
    return [
      {
        uuid: sharedUUID,
        kind: 'my-service' as ContainerKind,
        endpoint: containerOnAgentEndpointRef(agentEndpoint, sharedUUID),
        container: service1
      }
    ]
  }
)

// Agent 2 (Standby) - uses serveAgent with stateless containers
await client.serveAgent(
  'localhost:3802',
  {}, // Container factories for dynamic containers
  (agentEndpoint) => {
    // Return stateless containers
    const service2 = new MyService(sharedUUID)
    return [
      {
        uuid: sharedUUID,
        kind: 'my-service' as ContainerKind,
        endpoint: containerOnAgentEndpointRef(agentEndpoint, sharedUUID),
        container: service2
      }
    ]
  }
)

// Agent 1 accepted, Agent 2 rejected (agent1 already owns it)
// Failover happens automatically when container is removed
```

### Key Methods

```typescript
// Use serveAgent to create agents with stateless containers
await client.serveAgent(
  endpointUrl,
  containerFactories,
  (agentEndpoint) => [{
    uuid,
    kind,
    endpoint,
    container
  }]
)

// Monitor for failover events
client.onUpdate(async (event) => {
  for (const c of event.containers) {
    if (c.event === NetworkEventKind.removed) {
      console.log('Container removed - failover in progress')
    }
  }
```

````

### Key Methods

```typescript
// Add a stateless container to agent
agent.addStatelessContainer(uuid, kind, endpoint, container)

````

### What Happens?

1. **Both agents register via serveAgent** → First one's container is accepted, second is rejected
2. **Rejected agent** → Terminates its container instance
3. **Active container fails** → Network broadcasts removal event
4. **Standby agents** → Automatically re-register (100ms delay)
5. **First standby wins** → Takes over as new active instance

### Common Patterns

#### Leader Election

```typescript
const leaderId = `cluster-${clusterId}-leader` as ContainerUuid

await client.serveAgent(`localhost:${port}`, {}, (agentEndpoint) => [
  {
    uuid: leaderId,
    kind: 'leader' as ContainerKind,
    endpoint: containerOnAgentEndpointRef(agentEndpoint, leaderId),
    container: leaderService
  }
])
// First agent to register becomes leader
```

#### Singleton Services

```typescript
const singletonId = 'migration-service' as ContainerUuid

await client.serveAgent(`localhost:${port}`, {}, (agentEndpoint) => [
  {
    uuid: singletonId,
    kind: 'migration' as ContainerKind,
    endpoint: containerOnAgentEndpointRef(agentEndpoint, singletonId),
    container: migrationService
  }
])
// Only one instance runs across cluster
```

#### Database Replica

```typescript
const dbId = `database-replica-${replicaId}` as ContainerUuid

await client.serveAgent(`localhost:${port}`, {}, (agentEndpoint) => [
  {
    uuid: dbId,
    kind: 'database' as ContainerKind,
    endpoint: containerOnAgentEndpointRef(agentEndpoint, dbId),
    container: databaseReplica
  }
])
// Multiple replicas with same UUID for HA
```

### Gotchas

❌ **Don't** use different UUIDs on different agents (they won't compete)
✅ **Do** use the same UUID across all HA agents

❌ **Don't** manually call `agent.addStatelessContainer()` - use `serveAgent` instead
✅ **Do** use the stateless containers factory parameter in `serveAgent`

❌ **Don't** expect instant failover (there's a ~100ms delay)
✅ **Do** design for eventual consistency

### Testing

```bash
# Terminal 1: Start network
cd pods/network-pod && rushx dev

# Terminal 2: Run example
npx ts-node examples/ha-stateless-container-example.ts
```

### Next Steps

- Read full docs: `docs/HA_STATELESS_CONTAINERS.md`
- See working example: `examples/ha-stateless-container-example.ts`
- Run tests: `cd packages/core && rushx test`

### Questions?

- How long is failover? ~100ms by default
- Can I have 3+ standbys? Yes, first to re-register wins
- Does state transfer? No, containers are stateless
- What about split-brain? No automatic protection (use network redundancy)
