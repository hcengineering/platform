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
import type { Doc, Ref } from '@hcengineering/core'
import { navigate, type Location, getCurrentResolvedLocation } from '@hcengineering/ui'
import { chatId } from '@hcengineering/chat'
import { getClient } from '@hcengineering/presentation'
import { type Message } from '@hcengineering/communication-types'
import workbench from '@hcengineering/workbench'
import { openWidget } from '@hcengineering/workbench-resources'

import chat from './plugin'
import { type ChatWidgetData } from './types'

export function decodeURI (value: string): ['type', Ref<MasterTag>] | ['card', Ref<Card>] {
  return decodeURIComponent(value).split('|') as any
}

export function encodeURI (type: 'type' | 'card', ref: Ref<Doc>): string {
  return [type, ref].join('|')
}

export function getCardIdFromLocation (loc: Location): Ref<Card> | undefined {
  if (loc.path[2] !== chatId) {
    return undefined
  }
  const [type, ref] = decodeURI(loc.path[3])
  if (type !== 'card') {
    return undefined
  }
  return ref
}

export function getTypeIdFromLocation (loc: Location): Ref<MasterTag> | undefined {
  if (loc.path[2] !== chatId) {
    return undefined
  }
  const [type, ref] = decodeURI(loc.path[3])
  if (type !== 'type') {
    return undefined
  }
  return ref
}

export function navigateToCard (_id: Ref<Card>): void {
  const loc = getCurrentResolvedLocation()

  loc.path[2] = chatId
  loc.path[3] = encodeURI('card', _id)
  delete loc.query?.message

  navigate(loc)
}

export function navigateToType (_id: Ref<MasterTag>): void {
  const loc = getCurrentResolvedLocation()

  loc.path[2] = chatId
  loc.path[3] = encodeURI('type', _id)
  delete loc.query?.message

  navigate(loc)
}

export async function openThreadInSidebar (message: Message): Promise<void> {
  const client = getClient()

  const widget = client.getModel().findAllSync(workbench.class.Widget, { _id: chat.ids.ChatWidget })[0]
  if (widget === undefined) return

  const data: ChatWidgetData = {
    id: `${message.card}-${message.id}`,
    name: 'Thread',
    message: message.id,
    card: message.card as Ref<Card>
  }

  openWidget(widget, data)
}
