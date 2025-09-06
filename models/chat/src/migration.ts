//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import card, { type Card, cardId, type CardSpace, DOMAIN_CARD, type MasterTag } from '@hcengineering/card'
import core, {
  type Doc,
  type Ref,
  type Class,
  DOMAIN_MODEL_TX,
  type TxCreateDoc,
  DOMAIN_SPACE
} from '@hcengineering/core'
import {
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  type MigrateUpdate,
  type MigrationDocumentQuery,
  type MigrateMode,
  tryMigrate
} from '@hcengineering/model'
import chat from './plugin'

const channelMasterTag = 'chat:masterTag:Channel' as Ref<MasterTag>

export const chatOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, cardId, [
      {
        state: 'migrate-channels',
        mode: 'upgrade',
        func: migrateChannelsToThreads
      },
      {
        state: 'migrate-parent-info',
        mode: 'upgrade',
        func: migrateParentInfo
      },
      {
        state: 'migrate-channel-tags',
        mode: 'upgrade',
        func: migrateChannelTags
      },
      {
        state: 'migrate-card-spaces',
        mode: 'upgrade',
        func: migrateCardSpaces
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>, mode): Promise<void> {}
}

async function migrateChannelsToThreads (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_CARD,
    {
      _class: channelMasterTag
    },
    {
      _class: chat.masterTag.Thread
    }
  )
}

async function migrateChannelTags (client: MigrationClient): Promise<void> {
  const tagTxes = await client.find<TxCreateDoc<Class<Card>>>(DOMAIN_MODEL_TX, {
    _class: core.class.TxCreateDoc,
    objectClass: { $in: [card.class.MasterTag, card.class.Tag] }
  })
  const updates: {
    filter: MigrationDocumentQuery<TxCreateDoc<Class<Card>>>
    update: MigrateUpdate<TxCreateDoc<Class<Card>>>
  }[] = []
  for (const tagTx of tagTxes) {
    if (tagTx.attributes.extends !== channelMasterTag) {
      continue
    }

    updates.push({
      filter: { _id: tagTx._id },
      update: {
        attributes: {
          ...tagTx.attributes,
          extends: chat.masterTag.Thread
        }
      }
    })
  }
  await client.bulk(DOMAIN_MODEL_TX, updates)
  client.logger.log('Migrated channel tags', { allTags: tagTxes.length, updatedTags: updates.length })
}

async function migrateParentInfo (client: MigrationClient, mode: MigrateMode): Promise<void> {
  await performParentInfoMigration(client, 1000)
}

export async function performParentInfoMigration (client: MigrationClient, bulkSize: number = 1000): Promise<void> {
  let processedCards = 0
  const iterator = await client.traverse<Card>(DOMAIN_CARD, { _class: card.class.Card })
  try {
    while (true) {
      const cards = await iterator.next(bulkSize)
      if (cards === null || cards.length === 0) {
        break
      }
      const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []
      for (const card of cards) {
        if (card.parentInfo == null || card.parentInfo.length === 0) {
          continue
        }
        const needUpdate = card.parentInfo.some((info) => info._class === channelMasterTag)
        if (!needUpdate) {
          continue
        }
        const parents = card.parentInfo.map((info) => {
          if (info._class !== channelMasterTag) {
            return info
          }
          return {
            ...info,
            _class: chat.masterTag.Thread
          }
        })
        operations.push({
          filter: { _id: card._id },
          update: {
            parentInfo: parents
          }
        })
      }
      if (operations.length > 0) {
        await client.bulk(DOMAIN_CARD, operations)
      }
      processedCards += cards.length
      client.logger.log('Migrated cards', { count: processedCards })
    }
  } finally {
    await iterator.close()
  }
}

async function migrateCardSpaces (client: MigrationClient): Promise<void> {
  const cardSpaces = await client.find<CardSpace>(DOMAIN_SPACE, {
    _class: card.class.CardSpace
  })
  const updates: {
    filter: MigrationDocumentQuery<CardSpace>
    update: MigrateUpdate<CardSpace>
  }[] = []
  for (const cs of cardSpaces) {
    if (cs.types == null || !cs.types.includes(channelMasterTag)) {
      continue
    }
    const types = cs.types.filter((t) => t !== channelMasterTag)
    if (!types.includes(chat.masterTag.Thread)) {
      types.push(chat.masterTag.Thread)
    }
    updates.push({
      filter: { _id: cs._id },
      update: { types }
    })
  }

  await client.bulk(DOMAIN_SPACE, updates)
  client.logger.log('Migrated card spaces', { allSpaces: cardSpaces.length, updatedSpaces: updates.length })
}
