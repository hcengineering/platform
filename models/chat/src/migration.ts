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

import card, { cardId, DOMAIN_CARD, type MasterTag } from '@hcengineering/card'
import core, { type Client, type Ref, TxOperations } from '@hcengineering/core'
import { tryMigrate, tryUpgrade } from '@hcengineering/model'
import { type MigrateOperation, type MigrationClient, type MigrationUpgradeClient } from '@hcengineering/model'
import chat from './plugin'

const channelMasterTag = 'chat:masterTag:Channel' as Ref<MasterTag>

export const chatOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, cardId, [
      {
        state: 'migrate-channels',
        mode: 'upgrade',
        func: migrateChannelsToThreads
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>, mode): Promise<void> {
    await tryUpgrade(mode, state, client, cardId, [
      {
        state: 'migrate-parent-info',
        mode: 'upgrade',
        func: migrateParentInfo
      }
    ])
  }
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

async function migrateParentInfo (client: Client): Promise<void> {
  const txOp = new TxOperations(client, core.account.System)
  const cards = await client.findAll(card.class.Card, { parentInfo: { $exists: true } })
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
    await txOp.update(card, { parentInfo: parents })
  }
}
