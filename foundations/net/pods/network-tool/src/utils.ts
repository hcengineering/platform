import { TickManagerImpl } from '@hcengineering/network-core'

// Create tick manager
export const tickManager = new TickManagerImpl(2)
tickManager.start()

export const shutdownHandlers: (() => Promise<void>)[] = []

export function addShutdownHandler (handler: () => Promise<void>): void {
  shutdownHandlers.push(handler)
}

export function registerShutdown (): void {
  const shutdown = async (): Promise<void> => {
    for (const handler of shutdownHandlers) {
      await handler()
    }
    tickManager.stop()
    console.log('Shutting down Network Tool...')
    process.exit(0)
  }

  // Handle graceful shutdown
  process.on('SIGINT', (): void => {
    void shutdown()
  })

  process.on('SIGTERM', (): void => {
    void shutdown()
  })

  // Handle Ctrl+C in console
  process.on('SIGBREAK', (): void => {
    void shutdown()
  })

  process.on('exit', (): void => {
    void shutdown()
  })
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', { reason, promise })
  })

  process.on('uncaughtException', (error, origin) => {
    console.error('Uncaught Exception at:', { origin, error })
  })
}
