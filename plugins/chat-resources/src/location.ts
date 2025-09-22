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

import cardPlugin, { type Card, type MasterTag } from '@hcengineering/card'
import type { Class, Doc, Ref } from '@hcengineering/core'
import { navigate, getCurrentResolvedLocation, type Location, type ResolvedLocation } from '@hcengineering/ui'
import { chatId } from '@hcengineering/chat'
import { getClient } from '@hcengineering/presentation'
import { type LocationData } from '@hcengineering/workbench'
import { encodeObjectURI, decodeObjectURI } from '@hcengineering/view'
import { accessDeniedStore } from '@hcengineering/view-resources'

export function isFavoritesLocation (loc: Location): boolean {
  return loc.path[2] === chatId && loc.path[3] === 'favorites'
}

export function isAllLocation (loc: Location): boolean {
  return loc.path[2] === chatId && loc.path[3] === 'all'
}

export function getCardIdFromLocation (loc: Location): Ref<Card> | undefined {
  if (loc.path[2] !== chatId) {
    return undefined
  }
  const [_id, _class] = decodeObjectURI(loc.path[3])
  if (_class !== cardPlugin.class.Card) {
    return undefined
  }
  return _id as Ref<Card>
}

export function getTypeIdFromLocation (loc: Location): Ref<MasterTag> | undefined {
  if (loc.path[2] !== chatId) {
    return undefined
  }
  const [_id, _class] = decodeObjectURI(loc.path[3])
  if (_class !== cardPlugin.class.MasterTag) {
    return undefined
  }
  return _id as Ref<MasterTag>
}

export function navigateToCard (_id: Ref<Card>): void {
  const loc = getCurrentResolvedLocation()

  loc.path[2] = chatId
  loc.path[3] = encodeObjectURI(_id, cardPlugin.class.Card)
  delete loc.query?.message

  navigate(loc)
}

export function navigateToType (_id: Ref<MasterTag>): void {
  const loc = getCurrentResolvedLocation()

  loc.path[2] = chatId
  loc.path[3] = encodeObjectURI(_id, cardPlugin.class.MasterTag)
  delete loc.query?.message

  navigate(loc)
}

export function navigateToFavorites (): void {
  const loc = getCurrentResolvedLocation()

  loc.path[2] = chatId
  loc.path[3] = 'favorites'
  delete loc.query?.message

  navigate(loc)
}

export function navigateToAll (): void {
  const loc = getCurrentResolvedLocation()

  loc.path[2] = chatId
  loc.path[3] = 'all'
  delete loc.query?.message

  navigate(loc)
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== chatId) {
    return undefined
  }

  const [_id, _class] = decodeObjectURI(loc.path[3])

  if (_id != null && _class != null && _id !== '' && _class !== '') {
    return await generateLocation(loc, _id, _class)
  }
}

async function generateLocation (
  loc: Location,
  _id: Ref<Doc>,
  _class: Ref<Class<Doc>>
): Promise<ResolvedLocation | undefined> {
  const client = getClient()
  const doc = await client.findOne(_class, { _id })
  if (doc === undefined) {
    accessDeniedStore.set(true)
    return undefined
  }
  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''

  return {
    loc: {
      path: [appComponent, workspace, chatId, encodeObjectURI(_id, _class)],
      fragment: undefined
    },
    defaultLocation: {
      path: [appComponent, workspace, chatId, encodeObjectURI(_id, _class)],
      fragment: undefined
    }
  }
}

export async function resolveLocationData (loc: Location): Promise<LocationData> {
  const cardId = getCardIdFromLocation(loc)
  const typeId = getTypeIdFromLocation(loc)
  const client = getClient()

  if (cardId !== undefined) {
    const object = await client.findOne(cardPlugin.class.Card, { _id: cardId })

    if (object === undefined) {
      return {}
    }

    return { name: object.title }
  }

  if (typeId !== undefined) {
    const object = await client.findOne(cardPlugin.class.MasterTag, { _id: typeId })

    if (object === undefined) {
      return {}
    }

    return { nameIntl: object.label }
  }

  return {}
}
