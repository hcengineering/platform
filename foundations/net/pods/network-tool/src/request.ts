import { createNetworkClient } from '@hcengineering/network-client'
import {
  type NetworkEvent,
  type ContainerKind,
  type ContainerUuid,
  NetworkEventKind
} from '@hcengineering/network-core'
import { program } from 'commander'
import { addShutdownHandler, tickManager } from './utils'

export function registerRequest (): void {
  program
    .command('request <kind>')
    .description('Connect to network and request a container undefinitely')
    .option('-n, --network <network>', 'Network address', 'localhost:3737')
    .option('-u, --uuid <uuid>', 'Container UUID to request')
    .option(
      '-l, --label <label>',
      'Label to add to the container. Allow multiple or ; separated',
      (val: string, memo: string[]) => {
        memo.push(...val.split(';'))
        return memo
      },
      []
    )
    .action(async (kind: string, cmd: { network: string, uuid?: string, label: string[] }) => {
      const network = process.env.NETWORK_HOST ?? cmd.network
      const client = createNetworkClient(network)

      const container = await client.get(kind as ContainerKind, { uuid: cmd.uuid as ContainerUuid, labels: cmd.label })

      console.log(`Requested container ${cmd.uuid} of kind ${kind}`)
      client.onUpdate(async (event: NetworkEvent) => {
        for (const added of event.containers) {
          if (added.container.uuid === container.uuid) {
            console.log(
              `Container ${NetworkEventKind[added.event]}: ${added.container.uuid} kind: ${added.container.kind} endpoint: ${added.container.endpoint}`
            )
          }
        }
      })

      // Every 5 second print a status of our requested container
      const stop = tickManager.register(async () => {
        if (container !== undefined) {
          console.log(`Container alive at for ${cmd.uuid}: ${container.endpoint}`)
        }
      }, 5)
      addShutdownHandler(async () => {
        stop()
        await client.close()
      })
    })
}
