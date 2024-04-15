import {
  type Account,
  AccountRole,
  DOMAIN_TX,
  type TxCreateDoc,
  TxOperations,
  type TxUpdateDoc
} from '@hcengineering/core'
import { guestId } from '@hcengineering/guest'
import {
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  type ModelLogger,
  tryMigrate,
  tryUpgrade
} from '@hcengineering/model'
import core from '@hcengineering/model-core'
import guest from './plugin'

async function createSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: guest.space.Links
  })
  if (current === undefined) {
    await tx.createDoc(
      core.class.Space,
      core.space.Space,
      {
        name: 'Links',
        description: 'Space for all guest links',
        private: false,
        archived: false,
        members: []
      },
      guest.space.Links
    )
  }
}

async function createDefaults (client: MigrationUpgradeClient): Promise<void> {
  const txOp = new TxOperations(client, core.account.System)
  await createSpace(txOp)
}

export const guestOperation: MigrateOperation = {
  async migrate (client: MigrationClient, logger: ModelLogger): Promise<void> {
    await tryMigrate(client, guestId, [
      {
        state: 'migrateRoles',
        func: async (client) => {
          const stateMap = {
            0: AccountRole.User,
            1: AccountRole.Maintainer,
            2: AccountRole.Owner
          }
          const createTxes = await client.find<TxCreateDoc<Account>>(DOMAIN_TX, {
            _class: core.class.TxCreateDoc,
            'attributes.role': { $in: [0, 1, 2] }
          })
          for (const tx of createTxes) {
            await client.update(
              DOMAIN_TX,
              {
                _id: tx._id
              },
              {
                $set: {
                  'attributes.role': (stateMap as any)[tx.attributes.role]
                }
              }
            )
          }
          const updateTxes = await client.find<TxUpdateDoc<Account>>(DOMAIN_TX, {
            _class: core.class.TxUpdateDoc,
            'operations.role': { $in: [0, 1, 2] }
          })
          for (const tx of updateTxes) {
            await client.update(
              DOMAIN_TX,
              {
                _id: tx._id
              },
              {
                $set: {
                  'operations.role': (stateMap as any)[(tx.operations as any).role]
                }
              }
            )
          }
        }
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    await tryUpgrade(client, guestId, [
      {
        state: 'create-defaults',
        func: async (client) => {
          await createDefaults(client)
        }
      }
    ])
  }
}
