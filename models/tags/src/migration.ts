import core, { TxOperations } from '@hcengineering/core'
import {
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import tags from './plugin'
import { tagsId } from '@hcengineering/tags'

export const tagsOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    await tryUpgrade(client, tagsId, [
      {
        state: 'create-defaults',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)
          const current = await tx.findOne(core.class.Space, {
            _id: tags.space.Tags
          })
          if (current === undefined) {
            await tx.createDoc(
              core.class.Space,
              core.space.Space,
              {
                name: 'Tags',
                description: 'Space for all tags',
                private: false,
                archived: false,
                members: []
              },
              tags.space.Tags
            )
          } else if (current.private) {
            await tx.update(current, { private: false })
          }
        }
      }
    ])
  }
}
