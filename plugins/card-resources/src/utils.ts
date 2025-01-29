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

import { type Card, cardId } from '@hcengineering/card'
import {
  type TxOperations,
  type Class,
  type Doc,
  type Ref,
  type WithLookup,
  type DocumentQuery,
  type RelatedDocument,
  type Client
} from '@hcengineering/core'
import { getClient, type ObjectSearchResult } from '@hcengineering/presentation'
import { type Location, type ResolvedLocation, getCurrentResolvedLocation, getPanelURI } from '@hcengineering/ui'
import view from '@hcengineering/view'
import { accessDeniedStore } from '@hcengineering/view-resources'
import { type LocationData } from '@hcengineering/workbench'
import CardSearchItem from './components/CardSearchItem.svelte'
import card from './plugin'

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
  const special = card.class.Card

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
