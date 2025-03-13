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
import { groupByArray, type Hierarchy, type Ref } from '@hcengineering/core'
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
  cards: Card[],
  contexts: NotificationContext[],
  state: NavigatorState
): Promise<NavigationSection[]> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const { threads, channels, other } = splitCards(cards, hierarchy)
  const cardByClass = groupByArray(other, (it) => it._class)

  const result: NavigationSection[] = []

  if (threads.length > 0) {
    result.push(getSection(chat.masterTag.Thread, threads, contexts, state, hierarchy))
  }

  if (channels.length > 0) {
    result.push(getSection(chat.masterTag.Channel, channels, contexts, state, hierarchy))
  }

  const cardSessions: Array<[string, NavigationSection]> = []
  for (const [_class, cards] of cardByClass.entries()) {
    const section = getSection(_class, cards, contexts, state, hierarchy)
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
  contexts: NotificationContext[],
  state: NavigatorState,
  hierarchy: Hierarchy
): NavigationSection {
  const clazz = hierarchy.getClass(_class)

  return {
    id: _class,
    title: clazz.pluralLabel ?? clazz.label,
    expanded: !state.collapsedSections.includes(_class),
    items: cards
      .map((card) => {
        const context = contexts.find((it) => it.card === card._id)
        return {
          id: card._id,
          label: card.title,
          icon: clazz.icon ?? chat.icon.Thread,
          notificationsCount: context?.notifications?.length ?? 0
        }
      })
      .sort((c1, c2) => c1.label.toLowerCase().localeCompare(c2.label.toLowerCase()))
  }
}

function splitCards (
  cards: Card[],
  hierarchy: Hierarchy
): {
    threads: Card[]
    channels: Card[]
    other: Card[]
  } {
  return cards.reduce<{
    threads: Card[]
    channels: Card[]
    other: Card[]
  }>(
    (acc, it) => {
      if (hierarchy.isDerived(it._class, chat.masterTag.Thread)) {
        acc.threads.push(it)
      } else if (hierarchy.isDerived(it._class, chat.masterTag.Channel)) {
        acc.channels.push(it)
      } else {
        acc.other.push(it)
      }
      return acc
    },
    { threads: [], channels: [], other: [] }
  )
}
