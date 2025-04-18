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

import { type Card, type MasterTag } from '@hcengineering/card'
import { type NavigationSection } from '@hcengineering/ui-next'
import { type Hierarchy, type Ref } from '@hcengineering/core'
import chat from '@hcengineering/chat'
import { translate } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import { get, writable } from 'svelte/store'
import { type NotificationContext } from '@hcengineering/communication-types'

const navigatorStateStorageKey = 'chat.navigatorState'

export interface NavigatorState {
  collapsedSections: string[]
}

export const navigatorStateStore = writable<NavigatorState>(restoreNavigatorState())

function restoreNavigatorState (): NavigatorState {
  const raw = localStorage.getItem(navigatorStateStorageKey)

  if (raw == null) return { collapsedSections: [] }

  try {
    const parsed = JSON.parse(raw)
    return {
      collapsedSections: parsed.collapsedSections ?? []
    }
  } catch (e) {
    return { collapsedSections: [] }
  }
}

export function toggleSection (id: string): void {
  const state = get(navigatorStateStore)
  const result: NavigatorState = state.collapsedSections.includes(id)
    ? {
        ...state,
        collapsedSections: state.collapsedSections.filter((it) => it !== id)
      }
    : { ...state, collapsedSections: [...state.collapsedSections, id] }

  localStorage.setItem(navigatorStateStorageKey, JSON.stringify(result))
  navigatorStateStore.set(result)
}

export async function cardsToChatSections (
  cardsByType: Map<Ref<MasterTag>, { cards: Card[], total: number }>,
  contexts: NotificationContext[],
  state: NavigatorState
): Promise<NavigationSection[]> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const threads = cardsByType.get(chat.masterTag.Thread)
  const channels = cardsByType.get(chat.masterTag.Channel)

  const result: NavigationSection[] = []

  if (threads != null && threads.cards.length > 0) {
    result.push(getSection(chat.masterTag.Thread, threads.cards, threads.total, contexts, state, hierarchy))
  }

  if (channels != null && channels.cards.length > 0) {
    result.push(getSection(chat.masterTag.Channel, channels.cards, channels.total, contexts, state, hierarchy))
  }

  const cardSessions: Array<[string, NavigationSection]> = []
  for (const [type, cards] of cardsByType.entries()) {
    if (type === chat.masterTag.Thread || type === chat.masterTag.Channel) continue
    if (cards.cards.length === 0) continue
    const section = getSection(type, cards.cards, cards.total, contexts, state, hierarchy)
    const label = await translate(section.title, {})
    cardSessions.push([label, section])
  }

  cardSessions.sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))

  result.push(...cardSessions.map(([, section]) => section))

  return result
}

function getSection (
  _class: Ref<MasterTag>,
  cards: Card[],
  total: number,
  contexts: NotificationContext[],
  state: NavigatorState,
  hierarchy: Hierarchy
): NavigationSection {
  const clazz = hierarchy.getClass(_class)

  return {
    id: _class,
    title: clazz.pluralLabel ?? clazz.label,
    expanded: !state.collapsedSections.includes(_class),
    total,
    items: cards.map((card) => {
      const context = contexts.find((it) => it.card === card._id)
      return {
        id: card._id,
        label: card.title,
        icon: clazz.icon ?? chat.icon.Thread,
        notificationsCount: context?.notifications?.length ?? 0
      }
    })
  }
}
