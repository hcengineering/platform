/**
 * Example: High Availability Stateless Container Registration
 * 
 * This example demonstrates how to use stateless containers with multiple agents
 * for HA (High Availability) scenarios. When multiple agents register the same
 * container UUID, the network will choose the first one and reject others.
 * 
 * When a container is closed/removed, standby agents will automatically attempt
 * to re-register their instance, providing automatic failover.
 * 
 * @example
 * // Start the Huly Network server first:
 * // cd pods/network-pod && rushx dev
 * 
 * // Then run this example:
 * // npx ts-node examples/ha-stateless-container-example.ts
 */

import { AgentImpl, containerUuid as generateContainerUuid, TickManagerImpl } from '../packages/core/src'
import { createNetworkClient, NetworkAgentServer } from '../packages/client/src'
import type { 
  Container, 
  ContainerUuid, 
  ContainerKind,
  ContainerEndpointRef,
  ClientUuid,
  GetOptions
} from '../packages/core/src'

// Example stateless container implementation
class HAServiceContainer implements Container {
  private connections = new Map<ClientUuid, (data: any) => Promise<void>>()
  
  constructor (
    readonly uuid: ContainerUuid,
    readonly serviceName: string
  ) {
    console.log(`[${serviceName}] Container ${uuid} created`)
  }

  async request (operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    console.log(`[${this.serviceName}] Request: ${operation}`, data)
    
    switch (operation) {
      case 'status':
        return { 
          uuid: this.uuid, 
          serviceName: this.serviceName,
          status: 'active',
          timestamp: Date.now()
        }
      case 'shutdown':
        console.log(`[${this.serviceName}] Shutdown requested`)
        await this.terminate()
        return { success: true }
      default:
        return { error: 'Unknown operation' }
    }
  }

  async ping (): Promise<void> {
    // Health check
  }

  async terminate (): Promise<void> {
    console.log(`[${this.serviceName}] Terminating container ${this.uuid}`)
    // Cleanup resources
  }

  async connect (clientId: ClientUuid, broadcast: (data: any) => Promise<void>): Promise<void> {
    this.connections.set(clientId, broadcast)
  }

  async disconnect (clientId: ClientUuid): Promise<void> {
    this.connections.delete(clientId)
  }
}

/**
 * Create an agent with stateless container support
 */
async function createHAAgent(
  agentId: string,
  agentName: string,
  sharedServiceUuid: ContainerUuid,
  port: number
): Promise<{ agent: AgentImpl, server: NetworkAgentServer }> {
  const tickManager = new TickManagerImpl(1)
  
  // Create the agent with a container factory (for dynamic containers)
  const agent = new AgentImpl(
    agentId as any,
    {
      'ha-service': async (options: GetOptions) => {
        const uuid = options.uuid ?? generateContainerUuid()
        const container = new HAServiceContainer(uuid, `${agentName}-dynamic`)
        return {
          uuid,
          container,
          endpoint: `ha-service://${agentName}/${uuid}` as ContainerEndpointRef
        }
      }
    } as any
  )

  // Add a stateless container that already exists
  // This simulates a pre-existing service that the agent wants to register
  const statelessContainer = new HAServiceContainer(sharedServiceUuid, agentName)
  agent.addStatelessContainer(
    sharedServiceUuid,
    'ha-service' as ContainerKind,
    `ha-service://${agentName}/${sharedServiceUuid}` as ContainerEndpointRef,
    statelessContainer
  )

  console.log(`[${agentName}] Agent created with stateless container ${sharedServiceUuid}`)

  // Start the agent server
  const server = new NetworkAgentServer(tickManager, 'localhost', '*', port)
  await server.start(agent)

  return { agent, server }
}

/**
 * Main example demonstrating HA scenario
 */
async function main(): Promise<void> {
  console.log('=== HA Stateless Container Example ===\n')

  // Shared service UUID - both agents will try to register this
  const sharedServiceUuid = 'service-leader-election-001' as ContainerUuid

  // Create network client
  await using client = createNetworkClient('localhost:3737')
  await client.waitConnection(5000)
  console.log('Connected to Huly Network\n')

  // Create two agents that will compete for the same container
  console.log('Creating Agent 1 (Primary)...')
  const { agent: agent1, server: server1 } = await createHAAgent(
    'ha-agent-1',
    'Primary',
    sharedServiceUuid,
    3801
  )

  console.log('Creating Agent 2 (Secondary)...')
  const { agent: agent2, server: server2 } = await createHAAgent(
    'ha-agent-2', 
    'Secondary',
    sharedServiceUuid,
    3802
  )

  // Register Agent 1 first - it should win
  console.log('\n--- Registering Agent 1 ---')
  await client.register(agent1)
  await new Promise(resolve => setTimeout(resolve, 500))

  // Register Agent 2 - it should be rejected for the shared container
  console.log('\n--- Registering Agent 2 ---')
  await client.register(agent2)
  await new Promise(resolve => setTimeout(resolve, 500))

  // Monitor container events
  client.onUpdate(async (event: any) => {
    console.log('\n>>> Network Event:')
    for (const container of event.containers) {
      console.log(`  Container ${container.container.uuid}: ${['added', 'updated', 'removed'][container.event]}`)
    }
  })

  // Verify which agent owns the container
  console.log('\n--- Testing Container Access ---')
  const containerRef = await client.get('ha-service' as ContainerKind, { 
    uuid: sharedServiceUuid 
  })
  const status = await containerRef.request('status')
  console.log('Container status:', status)

  // Simulate failover: terminate the active container
  console.log('\n--- Simulating Failover ---')
  console.log('Shutting down primary container...')
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Shutdown the primary agent's container
  await agent1.terminate(sharedServiceUuid)
  
  // Wait for secondary to take over
  console.log('Waiting for secondary agent to take over...')
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Verify failover
  try {
    const newContainerRef = await client.get('ha-service' as ContainerKind, { 
      uuid: sharedServiceUuid 
    })
    const newStatus = await newContainerRef.request('status')
    console.log('New container status after failover:', newStatus)
  } catch (error) {
    console.error('Failover verification failed:', error)
  }

  // Cleanup
  console.log('\n--- Cleanup ---')
  await containerRef.close()
  await server1.close()
  await server2.close()
  
  console.log('\nExample completed!')
}

// Run the example
main().catch(console.error)

export { createHAAgent, HAServiceContainer }
