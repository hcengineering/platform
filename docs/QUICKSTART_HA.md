# Quick Start: HA Stateless Containers

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
import { createNetworkClient } from '@hcengineering/network-client'

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

// 2. Create agents (both will try to register same UUID)
const sharedUUID = 'my-service-001' as ContainerUuid

// Agent 1 (Primary)
const agent1 = new AgentImpl('agent-1', {})
const service1 = new MyService(sharedUUID)
agent1.addStatelessContainer(
  sharedUUID,
  'my-service' as ContainerKind,
  'service://agent1/service-001' as ContainerEndpointRef,
  service1
)

// Agent 2 (Standby)
const agent2 = new AgentImpl('agent-2', {})
const service2 = new MyService(sharedUUID)
agent2.addStatelessContainer(
  sharedUUID,
  'my-service' as ContainerKind,
  'service://agent2/service-001' as ContainerEndpointRef,
  service2
)

// 3. Connect and register
const client = createNetworkClient('localhost:3737')
await client.waitConnection()

await client.register(agent1) // ✅ Accepted
await client.register(agent2) // ❌ Rejected (agent1 already owns it)

// 4. Failover happens automatically
await agent1.terminate(sharedUUID) // Agent1 stops
// After ~100ms, agent2 automatically takes over
```

### Key Methods

```typescript
// Add a stateless container to agent
agent.addStatelessContainer(uuid, kind, endpoint, container)

// Remove from tracking (if needed)
agent.removeStatelessContainer(uuid)

// Register with network (handles conflicts automatically)
await client.register(agent)

// Monitor for failover events
client.onUpdate(async (event) => {
  for (const c of event.containers) {
    if (c.event === NetworkEventKind.removed) {
      console.log('Container removed - failover in progress')
    }
  }
})
```

### What Happens?

1. **Both agents register** → First one is accepted, second is rejected
2. **Rejected agent** → Terminates its container instance
3. **Active container fails** → Network broadcasts removal event
4. **Standby agents** → Automatically re-register (100ms delay)
5. **First standby wins** → Takes over as new active instance

### Common Patterns

#### Leader Election

```typescript
const leaderId = `cluster-${clusterId}-leader` as ContainerUuid
agent.addStatelessContainer(leaderId, 'leader', endpoint, leaderService)
// First agent to register becomes leader
```

#### Singleton Service

```typescript
const singletonId = 'migration-service' as ContainerUuid
agent.addStatelessContainer(singletonId, 'migration', endpoint, migrationService)
// Only one instance will run migrations
```

#### Active-Standby Database

```typescript
const dbId = 'database-primary' as ContainerUuid
agent.addStatelessContainer(dbId, 'database', endpoint, databaseReplica)
// Primary serves writes, standby automatically promotes on failure
```

### Gotchas

❌ **Don't** use different UUIDs on different agents (they won't compete)
✅ **Do** use the same UUID across all HA agents

❌ **Don't** forget to handle termination of rejected containers
✅ **Do** let the agent.register() method handle it automatically

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
