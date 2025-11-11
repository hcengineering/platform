/**
 * Example 5: Error Handling and Retry Logic
 * 
 * This example demonstrates robust error handling patterns including:
 * - Exponential backoff retry logic
 * - Graceful degradation
 * - Timeout handling
 * - Connection recovery
 * 
 * @example
 * // Start the network server first:
 * // cd pods/network-pod && rushx dev
 * 
 * // Then run this example:
 * // cd examples && rushx run:retry
 */

import { AgentImpl, TickManagerImpl, NetworkImpl } from '@hcengineering/network-core'
import { NetworkServer } from '@hcengineering/network-server'
import { createNetworkClient, NetworkAgentServer } from '@hcengineering/network-client'
import type { 
  Container, 
  ContainerUuid, 
  ClientUuid,
  ContainerKind,
  GetOptions
} from '@hcengineering/network-core'

class UnreliableServiceContainer implements Container {
  private callCount = 0
  private failureRate = 0.3 // 30% failure rate

  constructor(readonly uuid: ContainerUuid) {
    console.log(`[UnreliableService] Container ${uuid} created`)
  }

  async request(operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    this.callCount++
    
    // Simulate random failures
    if (Math.random() < this.failureRate) {
      console.log(`[UnreliableService] ❌ Request ${this.callCount} failed (simulated)`)
      throw new Error(`Service temporarily unavailable (call ${this.callCount})`)
    }

    // Simulate slow responses occasionally
    const delay = Math.random() > 0.7 ? 2000 : 100
    await new Promise(resolve => setTimeout(resolve, delay))

    console.log(`[UnreliableService] ✓ Request ${this.callCount} succeeded`)
    return {
      success: true,
      operation,
      callNumber: this.callCount,
      data: data?.value ? data.value * 2 : null
    }
  }

  async ping(): Promise<void> {}

  async terminate(): Promise<void> {
    console.log(`[UnreliableService] Terminated after ${this.callCount} calls`)
  }

  connect(clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void {}
  disconnect(clientId: ClientUuid): void {}
}

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000,
  maxDelay = 10000
): Promise<T> {
  let lastError: Error | undefined
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/${maxRetries}...`)
      const result = await operation()
      console.log(`  ✓ Success on attempt ${attempt}`)
      return result
    } catch (error: any) {
      lastError = error
      console.log(`  ✗ Attempt ${attempt} failed: ${error.message}`)
      
      if (attempt < maxRetries) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay)
        console.log(`  Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError?.message}`)
}

// Robust container access with retry and cleanup
async function robustContainerAccess(
  client: any,
  kind: ContainerKind,
  options: GetOptions,
  operation: string,
  data?: any,
  maxRetries = 3,
  acquireTimeoutMs = 5000
): Promise<any> {
  let containerRef: any
  
  try {
    // Get container with retry and timeout
    containerRef = await retryWithBackoff(async () => {
      return await withTimeout(
        client.get(kind, options),
        acquireTimeoutMs,
        'Container acquisition'
      )
    }, maxRetries)
    
    console.log(`✓ Container acquired: ${containerRef.uuid}`)
    
    // Perform operation with retry
    const result = await retryWithBackoff(async () => {
      return await containerRef.request(operation, data)
    }, maxRetries)
    
    return result
  } catch (error: any) {
    console.error(`✗ All attempts failed: ${error.message}`)
    throw error
  } finally {
    // Always cleanup
    if (containerRef) {
      try {
        await containerRef.close()
        console.log('✓ Container released')
      } catch (err: any) {
        console.error('✗ Failed to release container:', err.message)
      }
    }
  }
}

// Timeout wrapper
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

async function main(): Promise<void> {
  console.log('=== Error Handling and Retry Logic Example ===\n')

  // 1. Setup infrastructure
  const tickManager = new TickManagerImpl(1)
  tickManager.start()
  const network = new NetworkImpl(tickManager)
  const server = new NetworkServer(network, tickManager, '*', 3737)
  console.log('✓ Network server started\n')

  // 2. Create agent
  const agent = new AgentImpl('unreliable-agent' as any, {
    ['unreliable-service' as ContainerKind]: async (options: GetOptions) => {
      const uuid = options.uuid ?? `unreliable-${Date.now()}` as ContainerUuid
      const container = new UnreliableServiceContainer(uuid)
      return {
        uuid,
        container,
        endpoint: `unreliable://localhost/${uuid}` as any
      }
    }
  })

  const agentServer = new NetworkAgentServer(tickManager, 'localhost', '*', 3738)
  await agentServer.start(agent)
  console.log('✓ Agent server started\n')

  // 3. Connect client
  await using client = createNetworkClient('localhost:3737')
  
  try {
    await withTimeout(
      client.waitConnection(10000),
      5000,
      'Client connection'
    )
    console.log('✓ Client connected\n')
  } catch (error: any) {
    console.error('✗ Failed to connect:', error.message)
    throw error
  }

  // 4. Register agent
  await client.register(agent)
  console.log('✓ Agent registered\n')

  // 5. Test basic retry logic
  console.log('=== Test 1: Basic Retry with Backoff ===\n')
  try {
    const result = await robustContainerAccess(
      client,
      'unreliable-service' as ContainerKind,
      {},
      'process',
      { value: 42 }
    )
    console.log('Final result:', result)
  } catch (error: any) {
    console.error('Operation failed:', error.message)
  }
  console.log()

  // 6. Test multiple concurrent requests with error handling
  console.log('=== Test 2: Concurrent Requests with Individual Error Handling ===\n')
  const promises = []
  for (let i = 0; i < 5; i++) {
    promises.push(
      robustContainerAccess(
        client,
        'unreliable-service' as ContainerKind,
        {},
        'process',
        { value: i + 1 }
      ).then(result => ({ success: true, result }))
        .catch(error => ({ success: false, error: error.message }))
    )
  }

  const results = await Promise.all(promises)
  results.forEach((result, idx) => {
    if (result.success) {
      console.log(`Request ${idx + 1}: ✓ Success -`, result.result)
    } else {
      console.log(`Request ${idx + 1}: ✗ Failed -`, result.error)
    }
  })
  console.log()

  // 7. Test timeout handling
  console.log('=== Test 3: Timeout Handling ===\n')
  try {
    const containerRef = await withTimeout(
      client.get('unreliable-service' as ContainerKind, {}),
      3000,
      'Container acquisition'
    )
    console.log(`✓ Container acquired: ${containerRef.uuid}\n`)

    // Try with short timeout (likely to timeout on slow responses)
    for (let i = 0; i < 3; i++) {
      try {
        console.log(`Request ${i + 1} with 500ms timeout...`)
        const result = await withTimeout(
          containerRef.request('process', { value: i }),
          500,
          'Request'
        )
        console.log('  ✓ Completed:', result)
      } catch (error: any) {
        console.log('  ✗', error.message)
      }
    }
    
    await containerRef.close()
  } catch (error: any) {
    console.log('  ✗ Could not acquire container:', error.message)
  }
  console.log()

  // 8. Test graceful degradation
  console.log('=== Test 4: Graceful Degradation ===\n')
  
  async function getDataWithFallback(id: number) {
    try {
      // Try primary service
      const result = await robustContainerAccess(
        client,
        'unreliable-service' as ContainerKind,
        {},
        'process',
        { value: id },
        2 // Fewer retries for faster fallback
      )
      return { source: 'primary', data: result }
    } catch (error) {
      console.log('Primary service failed, using fallback...')
      // Fallback to cached/default data
      return { 
        source: 'fallback', 
        data: { 
          success: true, 
          operation: 'process', 
          value: id,
          cached: true 
        } 
      }
    }
  }

  const dataResults = []
  for (let i = 0; i < 3; i++) {
    const data = await getDataWithFallback(i + 1)
    dataResults.push(data)
    console.log(`Data ${i + 1}: from ${data.source} -`, data.data)
  }
  console.log()

  // 9. Test circuit breaker pattern
  console.log('=== Test 5: Circuit Breaker Pattern ===\n')
  
  class CircuitBreaker {
    private failureCount = 0
    private lastFailureTime = 0
    private state: 'closed' | 'open' | 'half-open' = 'closed'
    
    constructor(
      private readonly failureThreshold = 3,
      private readonly resetTimeout = 5000
    ) {}

    async execute<T>(operation: () => Promise<T>): Promise<T> {
      // Check if circuit should reset
      if (this.state === 'open') {
        if (Date.now() - this.lastFailureTime > this.resetTimeout) {
          console.log('  [CircuitBreaker] Half-open: Trying again...')
          this.state = 'half-open'
        } else {
          throw new Error('Circuit breaker is OPEN - service unavailable')
        }
      }

      try {
        const result = await operation()
        
        // Success - reset circuit breaker
        if (this.state === 'half-open') {
          console.log('  [CircuitBreaker] Closed: Service recovered')
        }
        this.failureCount = 0
        this.state = 'closed'
        
        return result
      } catch (error) {
        this.failureCount++
        this.lastFailureTime = Date.now()
        
        if (this.failureCount >= this.failureThreshold) {
          console.log(`  [CircuitBreaker] OPEN: ${this.failureCount} failures detected`)
          this.state = 'open'
        }
        
        throw error
      }
    }

    getState() {
      return { state: this.state, failures: this.failureCount }
    }
  }

  const breaker = new CircuitBreaker(2, 3000)
  
  for (let i = 0; i < 5; i++) {
    try {
      const result = await breaker.execute(async () => {
        return await robustContainerAccess(
          client,
          'unreliable-service' as ContainerKind,
          {},
          'process',
          { value: i },
          1 // Single retry
        )
      })
      console.log(`Request ${i + 1}: ✓`, result)
    } catch (error: any) {
      console.log(`Request ${i + 1}: ✗`, error.message)
    }
    console.log('  Circuit breaker state:', breaker.getState())
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  console.log()

  // 10. Cleanup
  console.log('--- Cleanup ---')
  client.close()
  await agentServer.close()
  await server.close()
  tickManager.stop()
  console.log('✓ Cleanup complete')
  
  console.log('\n✓ Example completed successfully!')
  console.log('\nKey patterns demonstrated:')
  console.log('  1. Exponential backoff retry')
  console.log('  2. Timeout handling')
  console.log('  3. Graceful degradation with fallbacks')
  console.log('  4. Circuit breaker pattern')
  console.log('  5. Proper resource cleanup')
  
  // Exit cleanly
  await new Promise(resolve => setTimeout(resolve, 500))
  process.exit(0)
}

main().catch(console.error)

export { UnreliableServiceContainer, retryWithBackoff, withTimeout }
