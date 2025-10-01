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

import { AgentImpl, TickManagerImpl, NetworkImpl } from '../packages/core/src'
import { NetworkServer } from '../packages/server/src'
import { createNetworkClient, NetworkAgentServer } from '../packages/client/src'
import type { 
  Container, 
  ContainerUuid, 
  ClientUuid,
  ContainerKind,
  GetOptions
} from '../packages/core/src'

class DataProcessorContainer implements Container {
  private data: Map<string, any> = new Map()

  constructor(readonly uuid: ContainerUuid) {
    console.log(`[DataProcessor] Container ${uuid} created`)
  }

  async request(operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    console.log(`[DataProcessor] Operation: ${operation}`, data)
    
    switch (operation) {
      case 'store':
        this.data.set(data.key, data.value)
        return { success: true, key: data.key }

      case 'retrieve':
        const value = this.data.get(data.key)
        return { success: true, value, found: value !== undefined }

      case 'delete':
        const existed = this.data.delete(data.key)
        return { success: true, deleted: existed }

      case 'list':
        return { success: true, keys: Array.from(this.data.keys()) }

      case 'stats':
        return { 
          success: true, 
          totalKeys: this.data.size,
          uuid: this.uuid 
        }

      default:
        return { success: false, error: 'Unknown operation' }
    }
  }

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
    'data-processor': async (options: GetOptions) => {
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
  const client = createNetworkClient('localhost:3737')
  await client.waitConnection(5000)
  console.log('✓ Client connected\n')

  // 4. Register agent
  await client.register(agent)
  console.log('✓ Agent registered\n')

  // 5. Get a container
  console.log('--- Requesting container ---')
  const containerRef = await client.get('data-processor' as ContainerKind, {})
  console.log(`✓ Got container: ${containerRef.uuid}\n`)

  // 6. Perform various operations
  console.log('--- Storing data ---')
  await containerRef.request('store', { key: 'user:123', value: { name: 'Alice', age: 30 } })
  await containerRef.request('store', { key: 'user:456', value: { name: 'Bob', age: 25 } })
  await containerRef.request('store', { key: 'config:app', value: { theme: 'dark' } })
  console.log('✓ Data stored\n')

  console.log('--- Retrieving data ---')
  const result1 = await containerRef.request('retrieve', { key: 'user:123' })
  console.log('Retrieved:', result1)

  const result2 = await containerRef.request('retrieve', { key: 'user:456' })
  console.log('Retrieved:', result2)

  const result3 = await containerRef.request('retrieve', { key: 'nonexistent' })
  console.log('Retrieved (not found):', result3)
  console.log()

  console.log('--- Listing all keys ---')
  const listResult = await containerRef.request('list')
  console.log('All keys:', listResult)
  console.log()

  console.log('--- Getting stats ---')
  const stats = await containerRef.request('stats')
  console.log('Stats:', stats)
  console.log()

  console.log('--- Deleting data ---')
  const deleteResult = await containerRef.request('delete', { key: 'user:456' })
  console.log('Delete result:', deleteResult)

  const statsAfterDelete = await containerRef.request('stats')
  console.log('Stats after delete:', statsAfterDelete)
  console.log()

  // 7. Cleanup
  console.log('--- Cleanup ---')
  await containerRef.close()
  await client.close()
  await agentServer.close()
  await server.close()
  tickManager.stop()
  
  console.log('\n✓ Example completed successfully!')
}

main().catch(console.error)

export { DataProcessorContainer }
