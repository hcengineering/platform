import { NetworkImpl, TickManagerImpl } from '@hcengineering/network-core'
import { NetworkServer } from '@hcengineering/network-server'

/**
 * Main entry point for the network pod
 */
async function main(): Promise<void> {
  console.log('Starting Huly Network Pod...')

  // Create tick manager
  const tickManager = new TickManagerImpl(20)
  tickManager.start()

  // Create Docker-based network service
  const network = new NetworkImpl(tickManager)

  const port = process.env.PORT != null ? parseInt(process.env.PORT) : 3737

  // Create and start network server
  const server = new NetworkServer(network, tickManager, process.env.HOST ?? '*', port)

  console.log(`Network Pod started on port ${port}`)

  const shutdown = async () => {
    console.log('Shutting down Network Pod...')
    tickManager.stop()
    await server.close()
    network.close()
    process.exit(0)
  }

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    shutdown()
  })

  process.on('SIGTERM', async () => {
    shutdown()
  })
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Failed to start Network Pod:', err)
    process.exit(1)
  })
}
