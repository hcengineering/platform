import core, { TxOperations } from '@anticrm/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import { DOMAIN_TAGS } from './index'
import tags from './plugin'

export const tagsOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await client.update(
      DOMAIN_TAGS,
      {
        _class: tags.class.TagElement,
        category: 'tags:category:Other'
      },
      {
        category: 'recruit:category:Other'
      }
    )
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
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
          private: true,
          archived: false,
          members: []
        },
        tags.space.Tags
      )
    }
  }
}
