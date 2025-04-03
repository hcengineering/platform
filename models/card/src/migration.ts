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

import { cardId, DOMAIN_CARD } from '@hcengineering/card'
import core, { TxOperations, type Client, type Data, type Doc } from '@hcengineering/core'
import {
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import view from '@hcengineering/view'
import card from '.'

export const cardOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, cardId, [
      {
        state: 'set-parent-info',
        mode: 'upgrade',
        func: setParentInfo
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>, mode): Promise<void> {
    await tryUpgrade(mode, state, client, cardId, [
      {
        state: 'migrateViewlets-v2',
        func: migrateViewlets
      },
      {
        state: 'removeVariantViewlets',
        func: removeVariantViewlets
      }
    ])
  }
}

async function removeVariantViewlets (client: Client): Promise<void> {
  const txOp = new TxOperations(client, core.account.System)
  const desc = client
    .getHierarchy()
    .getDescendants(card.class.Card)
    .filter((c) => c !== card.class.Card)
  const viewlets = await client.findAll(view.class.Viewlet, { attachTo: { $in: desc }, variant: { $exists: true } })
  for (const viewlet of viewlets) {
    await txOp.remove(viewlet)
  }
}

async function setParentInfo (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_CARD,
    {
      parentInfo: { $exists: false }
    },
    {
      parentInfo: []
    }
  )
}

function extractObjectProps<T extends Doc> (doc: T): Data<T> {
  const data: any = {}
  for (const key in doc) {
    if (key === '_id') {
      continue
    }
    data[key] = doc[key]
  }
  return data as Data<T>
}

async function migrateViewlets (client: Client): Promise<void> {
  const txOp = new TxOperations(client, core.account.System)
  const viewlets = await client.findAll(view.class.Viewlet, { attachTo: card.class.Card, variant: { $exists: false } })
  const masterTags = await client.findAll(card.class.MasterTag, {})
  const currentViewlets = await client.findAll(view.class.Viewlet, { attachTo: { $in: masterTags.map((p) => p._id) } })
  for (const masterTag of masterTags) {
    for (const viewlet of viewlets) {
      const base = extractObjectProps(viewlet)
      const resConfig = base.config
      let index = -1
      if (viewlet.descriptor === view.viewlet.List) {
        index = viewlet.config.findIndex((p) => typeof p !== 'string' && p.displayProps?.grow === true)
      }
      const attributes = client.getHierarchy().getOwnAttributes(masterTag._id)
      for (const attr of attributes) {
        // let push it after grow for the list
        if (index !== -1) {
          resConfig.splice(index + 1, 0, attr[1].name)
        } else {
          resConfig.push(attr[1].name)
        }
      }
      const current = currentViewlets.find(
        (p) => p.attachTo === masterTag._id && p.variant === viewlet.variant && p.descriptor === viewlet.descriptor
      )
      if (current === undefined) {
        await txOp.createDoc(view.class.Viewlet, core.space.Model, {
          ...base,
          config: resConfig,
          attachTo: masterTag._id
        })
      } else {
        await txOp.diffUpdate(current, {
          ...base,
          config: resConfig,
          attachTo: masterTag._id
        })
      }
    }
  }
}
