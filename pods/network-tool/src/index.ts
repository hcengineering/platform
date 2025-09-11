import { program } from 'commander'
import { registerAgentOperations } from './agents'
import { registerBenchmark } from './benchmark'
import { registerRequest } from './request'
import { registerShutdown } from './utils'

/**
 * Main entry point for the network pod
 */
function main (): void {
  program.version('0.7.0')

  program.command('version').action(() => {
    console.log(`network-tool git_version: ${process.env.GIT_REVISION ?? ''}`)
  })

  // Register commands
  registerRequest()
  registerBenchmark()
  registerAgentOperations()

  // Execute program
  program.parse(process.argv)
}

registerShutdown()
main()
