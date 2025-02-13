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

import { type Card, cardId, type MasterTag } from '@hcengineering/card'
import {
  type Class,
  type Client,
  type Doc,
  type DocumentQuery,
  type Ref,
  type RelatedDocument,
  type TxOperations,
  type WithLookup
} from '@hcengineering/core'
import { getClient, MessageBox, type ObjectSearchResult } from '@hcengineering/presentation'
import {
  getCurrentResolvedLocation,
  getPanelURI,
  type Location,
  type ResolvedLocation,
  showPopup
} from '@hcengineering/ui'
import view from '@hcengineering/view'
import { accessDeniedStore } from '@hcengineering/view-resources'
import { type LocationData } from '@hcengineering/workbench'
import CardSearchItem from './components/CardSearchItem.svelte'
import card from './plugin'

export async function deleteMasterTag (tag: MasterTag | undefined): Promise<void> {
  if (tag !== undefined) {
    const client = getClient()
    const objects = await client.findAll(tag._id, {})
    if (objects.length > 0) {
      if (tag._class === card.class.MasterTag) {
        showPopup(MessageBox, {
          label: card.string.DeleteMasterTag,
          message: card.string.DeleteMasterTagConfirm,
          action: async () => {
            const cards = await client.findAll(tag._id, {})
            const hierarchy = client.getHierarchy()
            const ops = client.apply(undefined, 'delete-master-tag')
            for (const obj of cards) {
              await ops.remove(obj)
            }
            const desc = hierarchy.getDescendants(tag._id)
            for (const obj of desc) {
              const desc = hierarchy.getClass(obj)
              await ops.remove(desc)
            }
            await ops.commit()
            await client.remove(tag)
          }
        })
      } else {
        showPopup(MessageBox, {
          label: card.string.DeleteTag,
          message: card.string.DeleteTagConfirm,
          action: async () => {
            const cards = await client.findAll(tag._id, {})
            const ops = client.apply(undefined, 'delete-tag')
            const hierarchy = client.getHierarchy()
            const desc = hierarchy.getDescendants(tag._id)
            for (const obj of desc) {
              const desc = hierarchy.getClass(obj)
              await ops.remove(desc)
            }
            const update: Record<string, boolean> = {}
            for (const des of desc) {
              update[des] = true
            }
            for (const obj of cards) {
              await ops.update(obj, { $unset: update })
            }
            await ops.commit()
            await client.remove(tag)
          }
        })
      }
    } else {
      const ops = client.apply(undefined, 'delete-tag')
      const hierarchy = client.getHierarchy()
      const desc = hierarchy.getDescendants(tag._id)
      for (const obj of desc) {
        const desc = hierarchy.getClass(obj)
        await ops.remove(desc)
      }
      await ops.commit()
      await client.remove(tag)
    }
  }
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== cardId) {
    return undefined
  }

  const id = loc.path[3]
  if (id !== undefined && id !== 'cards') {
    return await generateLocation(loc, id)
  }
}

async function generateLocation (loc: Location, id: string): Promise<ResolvedLocation | undefined> {
  const client = getClient()
  const doc = await client.findOne(card.class.Card, { _id: id as Ref<Card> })
  if (doc === undefined) {
    accessDeniedStore.set(true)
    return undefined
  }
  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  const special = doc._class

  const objectPanel = client.getHierarchy().classHierarchyMixin(doc._class as Ref<Class<Doc>>, view.mixin.ObjectPanel)
  const component = objectPanel?.component ?? view.component.EditDoc

  return {
    loc: {
      path: [appComponent, workspace],
      fragment: getPanelURI(component, doc._id, doc._class, 'content')
    },
    defaultLocation: {
      path: [appComponent, workspace, cardId, special],
      fragment: getPanelURI(component, doc._id, doc._class, 'content')
    }
  }
}

export async function resolveLocationData (loc: Location): Promise<LocationData> {
  const special = loc.path[3]
  const base = { nameIntl: card.string.Cards }
  if (special == null) {
    return base
  }

  if (special === 'cards') {
    return base
  }

  const client = getClient()
  const object = await client.findOne(card.class.Card, { _id: special as Ref<Card> })

  if (object === undefined) {
    return base
  }

  return { name: object.title }
}

export async function getCardTitle (client: TxOperations, ref: Ref<Card>, doc?: Card): Promise<string> {
  const object = doc ?? (await client.findOne(card.class.Card, { _id: ref }))
  if (object === undefined) throw new Error(`Card not found, _id: ${ref}`)
  return object.title
}

export async function getCardId (client: TxOperations, ref: Ref<Card>, doc?: Card): Promise<string> {
  const object = doc ?? (await client.findOne(card.class.Card, { _id: ref }))
  if (object === undefined) throw new Error(`Card not found, _id: ${ref}`)
  return object.title
}

export async function getCardLink (doc: Card): Promise<Location> {
  const loc = getCurrentResolvedLocation()
  loc.path.length = 2
  loc.fragment = undefined
  loc.query = undefined
  loc.path[2] = cardId
  loc.path[3] = doc._id

  return loc
}

export async function queryCard (
  client: Client,
  search: string,
  filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
): Promise<ObjectSearchResult[]> {
  const q: DocumentQuery<Card> = { title: { $like: `%${search}%` } }
  if (filter?.in !== undefined || filter?.nin !== undefined) {
    q._id = {}
    if (filter.in !== undefined) {
      q._id.$in = filter.in?.map((it) => it._id as Ref<Card>)
    }
    if (filter.nin !== undefined) {
      q._id.$nin = filter.nin?.map((it) => it._id as Ref<Card>)
    }
  }
  return (await client.findAll(card.class.Card, q, { limit: 200 })).map(toCardObjectSearchResult)
}

const toCardObjectSearchResult = (e: WithLookup<Card>): ObjectSearchResult => ({
  doc: e,
  title: e.title,
  icon: card.icon.Card,
  component: CardSearchItem
})
