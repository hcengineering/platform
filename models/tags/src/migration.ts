import core, { Ref, TxOperations } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationResult, MigrationUpgradeClient } from '@hcengineering/model'
import { TagElement, TagReference } from '@hcengineering/tags'
import { DOMAIN_TAGS } from './index'
import tags from './plugin'

async function updateTagRefCount (client: MigrationClient): Promise<void> {
  const tagElements = await client.find(DOMAIN_TAGS, { _class: tags.class.TagElement, refCount: { $exists: false } })
  const refs = await client.find<TagReference>(DOMAIN_TAGS, {
    _class: tags.class.TagReference,
    tag: { $in: tagElements.map((p) => p._id as Ref<TagElement>) }
  })
  const map = new Map<Ref<TagElement>, number>()
  for (const ref of refs) {
    map.set(ref.tag, (map.get(ref.tag) ?? 0) + 1)
  }
  const promises: Promise<MigrationResult>[] = []
  for (const tag of map) {
    promises.push(
      client.update(
        DOMAIN_TAGS,
        {
          _id: tag[0]
        },
        {
          refCount: tag[1]
        }
      )
    )
  }
  await Promise.all(promises)
}

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

    await updateTagRefCount(client)
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
