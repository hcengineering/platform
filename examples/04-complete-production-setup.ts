/**
 * Example 4: Complete Production Setup
 * 
 * This example shows a complete production-ready setup with:
 * - Multiple redundant agents
 * - Proper error handling
 * - Health monitoring
 * - Graceful shutdown
 * - Event monitoring for observability
 * 
 * @example
 * // Run this example:
 * // npx ts-node examples/04-complete-production-setup.ts
 */

import { NetworkImpl, TickManagerImpl, AgentImpl } from '../packages/core/src'
import { NetworkServer } from '../packages/server/src'
import { createNetworkClient, NetworkAgentServer } from '../packages/client/src'
import type { 
  Container, 
  ContainerUuid, 
  ClientUuid,
  ContainerKind,
  GetOptions,
  NetworkEvent
} from '../packages/core/src'

// Production container with proper lifecycle management
class ProductionServiceContainer implements Container {
  private connections = new Map<ClientUuid, (data: any) => Promise<void>>()
  private shutdownRequested = false
  private requestCount = 0
  private errorCount = 0
  private lastActivityTime = Date.now()

  constructor(
    readonly uuid: ContainerUuid,
    private readonly agentId: string,
    private readonly config: any
  ) {
    console.log(`[Service:${agentId}] Container ${uuid} started`)
  }

  async request(operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    if (this.shutdownRequested) {
      throw new Error('Container is shutting down')
    }

    this.requestCount++
    this.lastActivityTime = Date.now()

    try {
      console.log(`[Service:${this.agentId}] Processing ${operation} (request #${this.requestCount})`)

      switch (operation) {
        case 'process':
          // Simulate some work
          await new Promise(resolve => setTimeout(resolve, 100))
          return { 
            success: true, 
            operation,
            processedBy: this.agentId,
            requestId: this.requestCount,
            data: data?.value ? data.value * 2 : null
          }

        case 'healthCheck':
          return {
            success: true,
            healthy: !this.shutdownRequested,
            agentId: this.agentId,
            uuid: this.uuid,
            uptime: Date.now() - (this.lastActivityTime - (this.requestCount * 1000)),
            requestCount: this.requestCount,
            errorCount: this.errorCount,
            connections: this.connections.size
          }

        case 'getMetrics':
          return {
            success: true,
            metrics: {
              requestCount: this.requestCount,
              errorCount: this.errorCount,
              errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
              activeConnections: this.connections.size,
              lastActivityTime: this.lastActivityTime
            }
          }

        case 'simulateError':
          this.errorCount++
          throw new Error('Simulated error for testing')

        default:
          return { 
            success: false, 
            error: 'Unknown operation',
            supportedOperations: ['process', 'healthCheck', 'getMetrics', 'simulateError']
          }
      }
    } catch (error: any) {
      this.errorCount++
      console.error(`[Service:${this.agentId}] Error processing ${operation}:`, error.message)
      throw error
    }
  }

  async ping(): Promise<void> {
    // Health check - verify dependencies, connections, etc.
    if (this.shutdownRequested) {
      throw new Error('Container is shutting down')
    }
  }

  async terminate(): Promise<void> {
    if (this.shutdownRequested) return
    
    this.shutdownRequested = true
    console.log(`[Service:${this.agentId}] Terminating container ${this.uuid}...`)
    
    // Notify all connected clients
    await this.broadcastShutdown()
    
    // Cleanup resources
    this.connections.clear()
    
    console.log(`[Service:${this.agentId}] Container ${this.uuid} terminated`)
    console.log(`  Total requests: ${this.requestCount}`)
    console.log(`  Total errors: ${this.errorCount}`)
  }

  connect(clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void {
    console.log(`[Service:${this.agentId}] Client ${clientId} connected`)
    this.connections.set(clientId, broadcast)
  }

  disconnect(clientId: ClientUuid): void {
    console.log(`[Service:${this.agentId}] Client ${clientId} disconnected`)
    this.connections.delete(clientId)
  }

  private async broadcastShutdown(): Promise<void> {
    const promises = Array.from(this.connections.values()).map(handler =>
      handler({ 
        type: 'shutdown', 
        message: 'Container is terminating',
        agentId: this.agentId,
        uuid: this.uuid
      }).catch(err => console.error('[Service] Failed to notify client:', err))
    )
    await Promise.all(promises)
  }
}

async function startProductionSystem() {
  console.log('=== Complete Production Setup Example ===\n')
  console.log('Starting production system...\n')

  // 1. Start network server
  const tickManager = new TickManagerImpl(1000)
  tickManager.start()
  
  const network = new NetworkImpl(tickManager)
  const server = new NetworkServer(
    network, 
    tickManager, 
    '*', // Bind to all interfaces in production
    3737
  )
  console.log('✓ Network server started on port 3737')

  // 2. Start multiple agents for redundancy
  const agents = []
  const agentCount = 3
  
  for (let i = 1; i <= agentCount; i++) {
    const agent = new AgentImpl(`agent-${i}` as any, {
      'production-service': async (options: GetOptions) => {
        const uuid = options.uuid ?? `svc-${Date.now()}-${i}` as ContainerUuid
        const container = new ProductionServiceContainer(uuid, `agent-${i}`, { 
          agentId: i,
          environment: 'production'
        })
        return {
          uuid,
          container,
          endpoint: `prod://agent-${i}/${uuid}` as any
        }
      }
    })

    const agentServer = new NetworkAgentServer(
      tickManager,
      'localhost',
      '*',
      3738 + i
    )
    await agentServer.start(agent)
    agents.push({ agent, server: agentServer, id: `agent-${i}` })
    console.log(`✓ Agent ${i} started on port ${3738 + i}`)
  }

  console.log()

  // 3. Connect client with production timeout (3 seconds)
  await using client = createNetworkClient('localhost:3737')
  await client.waitConnection(5000)
  console.log('✓ Client connected')

  // 4. Register all agents
  for (const { agent, id } of agents) {
    await client.register(agent)
    console.log(`✓ ${id} registered`)
  }
  console.log()

  // 5. Setup comprehensive monitoring
  console.log('=== Setting up monitoring ===\n')
  
  let eventCount = 0
  const unsubscribe = client.onUpdate(async (event: NetworkEvent) => {
    eventCount++
    
    // Log agent events
    for (const agentEvent of event.agents) {
      const eventType = ['added', 'updated', 'removed'][agentEvent.event]
      console.log(`[Monitor] Agent ${agentEvent.id}: ${eventType}`)
      if (agentEvent.event === 2) { // removed
        console.log(`[Alert] Agent ${agentEvent.id} went offline!`)
      }
    }
    
    // Log container events
    for (const containerEvent of event.containers) {
      const eventType = ['added', 'updated', 'removed'][containerEvent.event]
      console.log(`[Monitor] Container ${containerEvent.container.uuid}: ${eventType}`)
      if (containerEvent.event === 2) { // removed
        console.log(`[Alert] Container ${containerEvent.container.uuid} was removed`)
      }
    }
  })

  console.log('✓ Monitoring active\n')
  console.log('=== Production system ready ===\n')

  // 6. Simulate production workload
  console.log('=== Simulating production workload ===\n')

  // Request containers (will be load-balanced across agents)
  const containers = []
  for (let i = 0; i < 5; i++) {
    const ref = await client.get('production-service' as ContainerKind, {})
    containers.push(ref)
    console.log(`✓ Container ${i + 1} acquired: ${ref.uuid}`)
  }
  console.log()

  // Send requests to all containers
  console.log('--- Sending requests ---')
  for (let i = 0; i < containers.length; i++) {
    try {
      const result = await containers[i].request('process', { value: i + 1 })
      console.log(`Container ${i + 1} result:`, result)
    } catch (error: any) {
      console.error(`Container ${i + 1} error:`, error.message)
    }
  }
  console.log()

  // Health checks
  console.log('--- Health checks ---')
  for (let i = 0; i < containers.length; i++) {
    const health = await containers[i].request('healthCheck')
    console.log(`Container ${i + 1}:`, health)
  }
  console.log()

  // Get metrics
  console.log('--- Metrics ---')
  const metrics = await containers[0].request('getMetrics')
  console.log('Service metrics:', metrics.metrics)
  console.log()

  // Test error handling
  console.log('--- Testing error handling ---')
  try {
    await containers[0].request('simulateError')
  } catch (error: any) {
    console.log('✓ Error handled correctly:', error.message)
  }
  console.log()

  // 7. Cleanup - demonstrate graceful shutdown
  console.log('=== Graceful shutdown ===\n')
  
  console.log('Releasing containers...')
  for (const container of containers) {
    await container.close()
  }
  console.log('✓ All containers released\n')

  console.log('Stopping agents...')
  for (const { server, id } of agents) {
    await server.close()
    console.log(`✓ ${id} stopped`)
  }
  console.log()

  console.log('Stopping network server...')
  await server.close()
  tickManager.stop()
  console.log('✓ Network server stopped\n')

  unsubscribe()
  console.log(`Total events monitored: ${eventCount}\n`)
  console.log('✓ Production system shutdown complete!')
  
  return {
    eventCount,
    containersCreated: containers.length,
    agentsUsed: agentCount
  }
}

// Main execution with signal handling
async function main() {
  let cleanupFn: (() => Promise<void>) | undefined

  // Setup graceful shutdown on signals
  const handleShutdown = async (signal: string) => {
    console.log(`\n\nReceived ${signal} - initiating graceful shutdown...`)
    if (cleanupFn) {
      await cleanupFn()
    }
    process.exit(0)
  }

  process.on('SIGTERM', () => handleShutdown('SIGTERM'))
  process.on('SIGINT', () => handleShutdown('SIGINT'))

  try {
    const stats = await startProductionSystem()
    
    console.log('\n=== Production System Statistics ===')
    console.log(`  Agents deployed: ${stats.agentsUsed}`)
    console.log(`  Containers created: ${stats.containersCreated}`)
    console.log(`  Events monitored: ${stats.eventCount}`)
    console.log('\n✓ Example completed successfully!')
  } catch (error: any) {
    console.error('\n✗ Production system error:', error.message)
    process.exit(1)
  }
}

main().catch(console.error)

export { ProductionServiceContainer }
