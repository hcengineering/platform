import { createAgent, createNetworkClient } from '@hcengineering/network-client'
import {
  containerOnAgentEndpointRef,
  containerUuid,
  type AgentEndpointRef,
  type ClientUuid,
  type Container,
  type ContainerKind,
  type ContainerReference,
  type ContainerUuid,
  type GetOptions
} from '@hcengineering/network-core'
import { program } from 'commander'
import { addShutdownHandler, tickManager } from './utils'

const benchmarkContainer = 'benchmark' as ContainerKind

class BenchmarkContainer implements Container {
  constructor (readonly uuid: ContainerUuid) {}

  async request (operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    // Just send data back
    return data
  }

  async ping (): Promise<void> {}

  async terminate (): Promise<void> {
    console.log('Stopping bench container')
  }

  async connect (clientId: ClientUuid, broadcast: (data: any) => Promise<void>): Promise<void> {}

  async disconnect (clientId: ClientUuid): Promise<void> {}
}

export function registerBenchmark (): void {
  program
    .command('bench-agent')
    .description('Register a benchmark container agent')
    .option('-n, --network <network>', 'Network address', 'localhost:3737')
    .option('-e, --endpoint <endpoint>', 'Agent endpoint address', 'localhost:3738')
    .option(
      '-l, --label <label>',
      'Label to add to the container. Allow multiple or ; separated',
      (val: string, memo: string[]) => {
        memo.push(...val.split(';'))
        return memo
      },
      []
    )
    .action(async (cmd: { network: string, label: string[], endpoint: string }) => {
      console.log('Starting benchmark agent')
      const network = process.env.NETWORK_HOST ?? cmd.network
      const client = createNetworkClient(network)

      const { agent, server } = await createAgent(cmd.endpoint, {
        [benchmarkContainer]: async (options: GetOptions) => {
          console.log('Starting bench container')
          const uuid = options.uuid ?? containerUuid()
          return {
            uuid,
            container: new BenchmarkContainer(uuid),
            endpoint: containerOnAgentEndpointRef(agent.endpoint as AgentEndpointRef, uuid)
          }
        }
      })

      await client.register(agent)

      const stop = tickManager.register(async () => {
        const containers = await client.list(benchmarkContainer)
        console.log(`Benchmark Agent: ${agent.uuid} has ${containers.length} '${benchmarkContainer}' containers`)
      }, 10)

      addShutdownHandler(async () => {
        stop()
        await server.close()
        await client.close()
      })
    })

  program
    .command('bench')
    .description('Run a container benchmark')
    .option('-n, --network <network>', 'Network address', 'localhost:3737')
    .option('-c, --count <count>', 'Number of containers to run', '1')
    .option('-r, --requests <requests>', 'Number of requests to send', '1')
    .option('-e, --exit <exit>', 'Exit after <exit>. If 1 exit on end', '0')
    .action(async (cmd: { network: string, count: number, requests: number, exit: number }) => {
      const network = process.env.NETWORK_HOST ?? cmd.network
      console.log('Benchmark agent')
      const client = createNetworkClient(network)

      console.log('Connected to network')

      const st = tickManager.now()
      const containers: ContainerReference[] = []
      for (let i = 0; i < cmd.count; i++) {
        console.log('request container:' + i)
        const container = await client.get(benchmarkContainer, { uuid: `benchmark-${i}` as ContainerUuid })
        console.log('container obtained', container.endpoint)
        containers.push(container)
      }
      const ed = tickManager.now()
      console.log(`Requested benchmark container ${containers.length} time: ${ed - st}ms`)

      // Send requests to containers via round robin
      for (let r = 0; r < cmd.requests; r++) {
        const reqSt = tickManager.now()
        const promises: Promise<any>[] = []
        for (let i = 0; i < containers.length; i++) {
          const container = containers[i]
          promises.push(container.request('echo', { hello: 'world', index: i, request: r }))
        }
        await Promise.all(promises)
        const reqEd = tickManager.now()
        console.log(`Sent requests to ${promises.length} benchmark containers time: ${reqEd - reqSt}ms`)
      }

      addShutdownHandler(async () => {
        await client.close()
      })
      if (cmd.exit > 0) {
        process.exit(0)
      }
    })
}
