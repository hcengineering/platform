import core, { Ref, TxOperations } from '@anticrm/core'
import { createOrUpdate, MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import tags from './plugin'
import { getCategories } from '@anticrm/skillset'
import { TagCategory } from '@anticrm/tags'

export const tagsOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)

    await createOrUpdate(
      tx,
      tags.class.TagCategory,
      tags.space.Tags,
      {
        icon: tags.icon.Tags,
        label: 'Other',
        targetClass: core.class.Doc,
        tags: ['']
      },
      tags.category.Other
    )

    for (const c of getCategories()) {
      await createOrUpdate(
        tx,
        tags.class.TagCategory,
        tags.space.Tags,
        {
          icon: tags.icon.Tags,
          label: c.label,
          targetClass: core.class.Doc,
          tags: c.skills
        },
        (tags.category.Category + c.id) as Ref<TagCategory>
      )
    }
  }
}
