import { createNetworkClient } from '@hcengineering/network-client'
import type { ContainerEvent, ContainerKind, ContainerUuid } from '@hcengineering/network-core'
import { program } from 'commander'
import { addShutdownHandler, tickManager } from './utils'

export function registerRequest (): void {
  program
    .command('request <kind> <uuid>')
    .description('Connect to network and request a container undefinitely')
    .option('-n, --network <network>', 'Network address', 'localhost:3737')
    .option(
      '-l, --label <label>',
      'Label to add to the container. Allow multiple or ; separated',
      (val: string, memo: string[]) => {
        memo.push(...val.split(';'))
        return memo
      },
      []
    )
    .action(async (kind: string, uuid: string, cmd: { network: string, label: string[] }) => {
      const network = process.env.NETWORK_HOST ?? cmd.network
      const client = createNetworkClient(network)

      const container = await client.get(uuid as ContainerUuid, { kind: kind as ContainerKind, labels: cmd.label })

      console.log(`Requested container ${uuid} of kind ${kind}`)
      client.onContainerUpdate(async (container: ContainerEvent) => {
        for (const added of container.added) {
          if (added.uuid === uuid) {
            console.log(`Container started: ${added.uuid} kind: ${added.kind} endpoint: ${added.endpoint}`)
          }
        }
        for (const removed of container.deleted) {
          if (removed.uuid === uuid) {
            console.log(`Container removed: ${removed.uuid}`)
          }
        }
        for (const updated of container.updated) {
          if (updated.uuid === uuid) {
            console.log(`Container updated: ${updated.uuid} endpoint: ${updated.endpoint}`)
          }
        }
      })

      // Every 5 second print a status of our requested container
      const stop = tickManager.register(() => {
        if (container !== undefined) {
          console.log(`Container alive at for ${uuid}: ${container.endpoint}`)
        }
      }, 5)
      addShutdownHandler(async () => {
        stop()
        await client.close()
      })
    })
}
