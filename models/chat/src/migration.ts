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

import card, { type Card, cardId, DOMAIN_CARD, type MasterTag } from '@hcengineering/card'
import type { Doc, Ref } from '@hcengineering/core'
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
