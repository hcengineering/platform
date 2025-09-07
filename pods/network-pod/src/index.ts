import { NetworkImpl, TickManagerImpl } from '@hcengineering/network-core'
import { NetworkServer } from '@hcengineering/network-server'

/**
 * Main entry point for the network pod
 */
async function main(): Promise<void> {
  console.log('Starting Huly Network Pod...')

  // Create tick manager
  const tickManager = new TickManagerImpl(20)

  // Create Docker-based network service
  const network = new NetworkImpl(tickManager)

  const port = process.env.NETWORK_POD_PORT != null ? parseInt(process.env.NETWORK_POD_PORT) : 3737

  // Create and start network server
  const server = new NetworkServer(network, tickManager, process.env.NETWORK_POD_HOST ?? '*', port)

  console.log(`Network Pod started on port ${port}`)

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down Network Pod...')
    await server.close()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('Shutting down Network Pod...')
    await server.close()
    process.exit(0)
  })
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Failed to start Network Pod:', err)
    process.exit(1)
  })
}
