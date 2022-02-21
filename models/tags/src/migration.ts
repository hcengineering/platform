import core, { DocumentQuery, Ref, TxOperations } from '@anticrm/core'
import { createOrUpdate, MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import { getCategories } from '@anticrm/skillset'
import { findTagCategory, TagCategory, TagElement } from '@anticrm/tags'
import tags from './plugin'

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

    const categories = await tx.findAll(tags.class.TagCategory, {})
    // Find all existing TagElement and update category based on skillset
    const tagElements = await tx.findAll(tags.class.TagElement, { category: null } as unknown as DocumentQuery<TagElement>)
    for (const t of tagElements) {
      if (t.category == null) {
        const category = findTagCategory(t.title, categories)
        await tx.update(t, { category: category })
      }
    }
  }
}
