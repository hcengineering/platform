/**
 * Example 1: Basic Container with Request/Response
 * 
 * This example demonstrates a simple container that handles various operations
 * and maintains internal state. Perfect for learning the basics of container implementation.
 * 
 * @example
 * // Start the network server first:
 * // cd pods/network-pod && rushx dev
 * 
 * // Then run this example:
 * // npx ts-node examples/01-basic-container-request-response.ts
 */

import { AgentImpl, TickManagerImpl, NetworkImpl, createProxyHandler } from '../packages/core/src'
import { NetworkServer } from '../packages/server/src'
import { createNetworkClient, NetworkAgentServer } from '../packages/client/src'
import type { 
  Container, 
  ContainerUuid, 
  ClientUuid,
  ContainerKind,
  GetOptions
} from '../packages/core/src'

// Define the service interface for type-safe proxy usage
interface DataProcessorService {
  store: (key: string, value: any) => Promise<{ success: boolean; key: string }>
  retrieve: (key: string) => Promise<{ success: boolean; value: any; found: boolean }>
  delete: (key: string) => Promise<{ success: boolean; deleted: boolean }>
  list: () => Promise<{ success: boolean; keys: string[] }>
  stats: () => Promise<{ success: boolean; totalKeys: number; uuid: ContainerUuid }>
}

class DataProcessorContainer implements Container {
  private data: Map<string, any> = new Map()

  constructor(readonly uuid: ContainerUuid) {
    console.log(`[DataProcessor] Container ${uuid} created`)
  }

  // Implement the service interface
  private serviceImpl: DataProcessorService = {
    store: async (key: string, value: any) => {
      this.data.set(key, value)
      return { success: true, key }
    },

    retrieve: async (key: string) => {
      const value = this.data.get(key)
      return { success: true, value, found: value !== undefined }
    },

    delete: async (key: string) => {
      const deleted = this.data.delete(key)
      return { success: true, deleted }
    },

    list: async () => {
      return { success: true, keys: Array.from(this.data.keys()) }
    },

    stats: async () => {
      return { 
        success: true, 
        totalKeys: this.data.size,
        uuid: this.uuid 
      }
    }
  }

  // Use proxy handler to route requests to service implementation
  request = createProxyHandler(this.serviceImpl as any, 'DataProcessorService')

  async ping(): Promise<void> {
    // Health check - container is alive
  }

  async terminate(): Promise<void> {
    console.log(`[DataProcessor] Container ${this.uuid} terminating...`)
    console.log(`[DataProcessor] Cleaning up ${this.data.size} entries`)
    this.data.clear()
  }

  connect(clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void {
    // Not using events in this basic example
  }

  disconnect(clientId: ClientUuid): void {
    // Cleanup client connection
  }
}

async function main(): Promise<void> {
  console.log('=== Basic Container with Request/Response Example ===\n')

  // 1. Setup network infrastructure
  const tickManager = new TickManagerImpl(1)
  tickManager.start()
  const network = new NetworkImpl(tickManager)
  const server = new NetworkServer(network, tickManager, '*', 3737)
  console.log('✓ Network server started on port 3737\n')

  // 2. Create agent with container factory
  const agent = new AgentImpl('data-agent' as any, {
    ['data-processor' as ContainerKind]: async (options: GetOptions) => {
      const uuid = options.uuid ?? `processor-${Date.now()}` as ContainerUuid
      const container = new DataProcessorContainer(uuid)
      return {
        uuid,
        container,
        endpoint: `data://localhost/${uuid}` as any
      }
    }
  })

  const agentServer = new NetworkAgentServer(tickManager, 'localhost', '*', 3738)
  await agentServer.start(agent)
  console.log('✓ Agent server started on port 3738\n')

  // 3. Connect as client
  await using client = createNetworkClient('localhost:3737')
  await client.waitConnection(5000)
  console.log('✓ Client connected\n')

  // 4. Register agent
  await client.register(agent)
  console.log('✓ Agent registered\n')

  // 5. Get a container
  console.log('--- Requesting container ---')
  const containerRef = await client.get('data-processor' as ContainerKind, {})
  console.log(`✓ Got container: ${containerRef.uuid}\n`)

  // 6. Create typed proxy using cast method
  const processor = containerRef.cast<DataProcessorService>('DataProcessorService')
  console.log('✓ Created typed proxy\n')

  // 7. Perform various operations using typed methods
  console.log('--- Storing data ---')
  await processor.store('user:123', { name: 'Alice', age: 30 })
  await processor.store('user:456', { name: 'Bob', age: 25 })
  await processor.store('config:app', { theme: 'dark' })
  console.log('✓ Data stored\n')

  console.log('--- Retrieving data ---')
  const result1 = await processor.retrieve('user:123')
  console.log('Retrieved:', result1)

  const result2 = await processor.retrieve('user:456')
  console.log('Retrieved:', result2)

  const result3 = await processor.retrieve('nonexistent')
  console.log('Retrieved (not found):', result3)
  console.log()

  console.log('--- Listing all keys ---')
  const listResult = await processor.list()
  console.log('All keys:', listResult)
  console.log()

  console.log('--- Getting stats ---')
  const stats = await processor.stats()
  console.log('Stats:', stats)
  console.log()

  console.log('--- Deleting data ---')
  const deleteResult = await processor.delete('user:456')
  console.log('Delete result:', deleteResult)

  const statsAfterDelete = await processor.stats()
  console.log('Stats after delete:', statsAfterDelete)
  console.log()

  // 8. Cleanup
  console.log('--- Cleanup ---')
  await containerRef.close()
  await agentServer.close()
  await server.close()
  tickManager.stop()
  
  console.log('\n✓ Example completed successfully!')
}

main().catch(console.error)

export { DataProcessorContainer }
