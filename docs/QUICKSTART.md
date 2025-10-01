# Quick Start Guide

Get started with Huly Virtual Network in under 10 minutes!

## ⚠️ Important Limitations

**Network Service Constraints:**

The **Network Server** (central coordinator) must run as a **single instance** only:

- ❌ Does NOT support high availability or clustering
- ❌ Cannot run multiple network servers simultaneously
- ✅ Agents and containers DO support HA through stateless registration

For production, use process monitoring (systemd, PM2, Kubernetes) to ensure quick restarts. Agents automatically reconnect when the network service restarts.

## Prerequisites

- **Node.js**: 22.0.0 or higher
- **PNPM**: 10.15 or higher (automatically installed via Rush)
- **ZeroMQ**: Native dependencies (automatically installed)
- **Operating System**: Linux, macOS, or Windows

## Installation

### Option 1: Clone and Build (Recommended for Development)

```bash
# Clone the repository
git clone https://github.com/hcengineering/huly.net.git
cd huly.net

# Install dependencies
node common/scripts/install-run-rush.js install

# Build all packages
node common/scripts/install-run-rush.js build

# Run tests to verify
node common/scripts/install-run-rush.js test
```

### Option 2: Docker (Recommended for Production)

```bash
# Pull the network server image
docker pull hardcoreeng/network-pod:latest

# Run the network server
docker run -d \
  --name huly-network \
  -p 3737:3737 \
  hardcoreeng/network-pod:latest
```

### Option 3: NPM Packages (Coming Soon)

```bash
npm install @hcengineering/network-core \
            @hcengineering/network-client \
            @hcengineering/network-server
```

## Your First Network Application

### Step 1: Create a Container

Create a file `my-container.ts`:

```typescript
import type { Container, ContainerUuid, ClientUuid } from '@hcengineering/network-core'

export class HelloWorldContainer implements Container {
  constructor(readonly uuid: ContainerUuid) {
    console.log(`Container ${uuid} created`)
  }

  async request(operation: string, data?: any): Promise<any> {
    switch (operation) {
      case 'greet':
        return { message: `Hello, ${data?.name || 'World'}!` }
      case 'status':
        return { status: 'running', uuid: this.uuid }
      default:
        return { error: 'Unknown operation' }
    }
  }

  async ping(): Promise<void> {
    // Health check
  }

  async terminate(): Promise<void> {
    console.log(`Container ${this.uuid} terminated`)
  }

  connect(clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void {}
  disconnect(clientId: ClientUuid): void {}
}
```

### Step 2: Start the Network Server

Create a file `server.ts`:

```typescript
import { NetworkImpl, TickManagerImpl } from '@hcengineering/network-core'
import { NetworkServer } from '@hcengineering/network-server'

const tickManager = new TickManagerImpl(1000)
tickManager.start()

const network = new NetworkImpl(tickManager)
const server = new NetworkServer(network, tickManager, '*', 3737)

console.log('🚀 Network server started on port 3737')

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...')
  await server.close()
  tickManager.stop()
  process.exit(0)
})
```

### Step 3: Create an Agent

Create a file `agent.ts`:

```typescript
import { createAgent } from '@hcengineering/network-client'
import { HelloWorldContainer } from './my-container'
import type { GetOptions, ContainerUuid } from '@hcengineering/network-core'

// Create agent with container factory
const { agent, server: agentServer } = await createAgent('localhost:3738', {
  'hello-world': async (options: GetOptions) => {
    const uuid = options.uuid ?? (`hello-${Date.now()}` as ContainerUuid)
    const container = new HelloWorldContainer(uuid)
    return {
      uuid,
      container,
      endpoint: `hello://localhost/${uuid}` as any
    }
  }
})

console.log('🤖 Agent server started on port 3738')

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down agent...')
  await agentServer.close()
  tickManager.stop()
  process.exit(0)
})
```

### Step 4: Create a Client

Create a file `client.ts`:

```typescript
import { createNetworkClient } from '@hcengineering/network-client'

async function main() {
  // Connect to network
  const client = createNetworkClient('localhost:3737')
  await client.waitConnection(5000)
  console.log('✅ Connected to network')

  // Register the agent (if running separately, do this in agent.ts)
  // await client.register(agent)

  // Get a container
  const containerRef = await client.get('hello-world' as any, {})
  console.log(`📦 Got container: ${containerRef.uuid}`)

  // Send requests
  const greeting = await containerRef.request('greet', { name: 'Alice' })
  console.log('Response:', greeting)

  const status = await containerRef.request('status')
  console.log('Status:', status)

  // Cleanup
  await containerRef.close()
  await client.close()
  console.log('👋 Disconnected')
}

main().catch(console.error)
```

### Step 5: Run Everything

Open three terminals:

**Terminal 1: Start Network Server**

```bash
npx ts-node server.ts
```

**Terminal 2: Start Agent**

```bash
npx ts-node agent.ts
```

**Terminal 3: Run Client**

```bash
npx ts-node client.ts
```

You should see:

```
✅ Connected to network
📦 Got container: hello-1234567890
Response: { message: 'Hello, Alice!' }
Status: { status: 'running', uuid: 'hello-1234567890' }
👋 Disconnected
```

## All-in-One Example

For a single-file demo, create `demo.ts`:

```typescript
import { NetworkImpl, TickManagerImpl } from '@hcengineering/network-core'
import { NetworkServer } from '@hcengineering/network-server'
import { createNetworkClient, createAgent } from '@hcengineering/network-client'
import type { Container, ContainerUuid, ClientUuid, GetOptions } from '@hcengineering/network-core'

class DemoContainer implements Container {
  constructor(readonly uuid: ContainerUuid) {}

  async request(op: string, data?: any): Promise<any> {
    return { message: `Processed ${op}`, data }
  }

  async ping(): Promise<void> {}
  async terminate(): Promise<void> {}
  connect(clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void {}
  disconnect(clientId: ClientUuid): void {}
}

async function demo() {
  // 1. Start network (NOTE: Only one instance allowed - no HA support)
  const tickManager = new TickManagerImpl(1)
  tickManager.start()
  const network = new NetworkImpl(tickManager)
  const server = new NetworkServer(network, tickManager, '*', 3737)
  console.log('✅ Network started')

  // 2. Start agent
  const { agent, server: agentServer } = await createAgent('localhost:3738', {
    demo: async (options: GetOptions) => {
      const uuid = options.uuid ?? (`demo-${Date.now()}` as ContainerUuid)
      return {
        uuid,
        container: new DemoContainer(uuid),
        endpoint: `demo://localhost/${uuid}` as any
      }
    }
  })
  console.log('✅ Agent started')

  // 3. Connect client and register agent
  const client = createNetworkClient('localhost:3737')
  await client.waitConnection(5000)
  await client.register(agent)
  console.log('✅ Client connected')

  // 4. Use container
  const ref = await client.get('demo' as any, {})
  const result = await ref.request('test', { value: 42 })
  console.log('✅ Result:', result)

  // 5. Cleanup
  await ref.close()
  await client.close()
  await agentServer.close()
  await server.close()
  tickManager.stop()
  console.log('✅ Demo complete!')
}

demo().catch(console.error)
```

Run it:

```bash
npx ts-node demo.ts
```

## Next Steps

Now that you have a working setup:

1. **Learn Core Concepts**: Read [Core Concepts](CORE_CONCEPTS.md) to understand the architecture
2. **Build Containers**: Explore [Container Development Guide](CONTAINER_DEVELOPMENT.md)
3. **Try Examples**: Run examples from the `examples/` directory
4. **Add Features**: Implement event broadcasting, multi-tenancy, or HA
5. **Deploy**: Follow [Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)

## Quick References

### Container Interface

```typescript
interface Container {
  request(operation: string, data?: any, clientId?: ClientUuid): Promise<any>
  ping(): Promise<void>
  terminate(): Promise<void>
  connect(clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void
  disconnect(clientId: ClientUuid): void
  onTerminated?(): void
}
```

### Common Operations

**Get a container:**

```typescript
const ref = await client.get('kind' as ContainerKind, {
  uuid: 'optional-uuid',
  labels: ['tag1', 'tag2']
})
```

**Send a request:**

```typescript
const result = await ref.request('operation', { data: 'value' })
```

**Connect for events:**

```typescript
const connection = await ref.connect()
connection.on = async (event) => {
  console.log('Event:', event)
}
```

**Cleanup:**

```typescript
await connection.close()
await ref.close()
await client.close()
```

## Troubleshooting

**Can't connect to network:**

- Ensure the network server is running
- Check the port (default: 3737)
- Verify firewall settings

**Container not found:**

- Register the agent before requesting containers
- Check that the agent supports that container kind
- Ensure the agent is still alive

**Timeout errors:**

- Increase timeout: `createNetworkClient('host:port', 3600)`
- Check network latency
- Verify services are responding

For more help, see the [Troubleshooting Guide](TROUBLESHOOTING.md).

## Resources

- [Examples Directory](../examples/) - Complete working examples
- [Core Concepts](CORE_CONCEPTS.md) - Architecture deep dive
- [API Reference](API_CORE.md) - Detailed API documentation
- [GitHub Repository](https://github.com/hcengineering/huly.net)

---

Ready to build something amazing? Start with the [Container Development Guide](CONTAINER_DEVELOPMENT.md)! 🚀
