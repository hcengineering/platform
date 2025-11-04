import { createNetworkClient } from '@hcengineering/network-client'
import { program } from 'commander'

export function registerAgentOperations (): void {
  program
    .command('list-agents')
    .description('Connect to network and list active agents')
    .option('-n, --network <network>', 'Network address', 'localhost:3737')
    .action(async (cmd: { network: string }) => {
      const network = process.env.NETWORK_HOST ?? cmd.network
      const client = createNetworkClient(network)

      const agents = await client.agents()
      console.log(`Active agents: ${agents.length}`)
      for (const agent of agents) {
        console.log(` - Agent: ${agent.agentId} at ${agent.endpoint} with ${agent.containers} containers\n`)
      }

      await client.close()
      // required to call exit handlers to terminate
      process.exit(0)
    })
}
