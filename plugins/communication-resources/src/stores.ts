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

import { get, writable } from 'svelte/store'
import { createLabelsQuery, createQuery, onClient, onCommunicationClient } from '@hcengineering/presentation'
import type { Label, Message, MessageID } from '@hcengineering/communication-types'
import type { Markup, Ref } from '@hcengineering/core'
import { languageStore } from '@hcengineering/ui'
import { type Card } from '@hcengineering/card'
import communication from '@hcengineering/communication'
import core from '@hcengineering/core'

export const labelsStore = writable<Label[]>([])
export const messageEditingStore = writable<MessageID | undefined>(undefined)
export const translateMessagesStore = writable<Map<MessageID, TranslateMessagesStatus>>(new Map())
export const threadCreateMessageStore = writable<Message | undefined>(undefined)
export const guestCommunicationAllowedCards = writable<Array<Ref<Card>>>([])

export interface TranslateMessagesStatus {
  inProgress: boolean
  shown: boolean
  result?: Markup
}

languageStore.subscribe(() => {
  translateMessagesStore.set(new Map())
})

export function isMessageTranslated (messageId: MessageID): boolean {
  return get(translateMessagesStore).get(messageId)?.result != null
}

export function isMessageTranslating (messageId: MessageID): boolean {
  return get(translateMessagesStore).get(messageId)?.inProgress === true
}

export function getMessageTranslatedMarkup (messageId: MessageID): Markup | undefined {
  return get(translateMessagesStore).get(messageId)?.result
}

export function isShownTranslatedMessage (messageId: MessageID): boolean {
  const result = get(translateMessagesStore).get(messageId)
  return result?.shown === true && result?.result != null
}

const query = createLabelsQuery(true)

onCommunicationClient(() => {
  query.query({}, (res) => {
    labelsStore.set(res)
  })
})

const guestCommunicationSettingsQuery = createQuery(true)

onClient(() => {
  guestCommunicationSettingsQuery.query(
    communication.class.GuestCommunicationSettings,
    { space: core.space.Workspace },
    (res) => {
      if (res.length === 0) return
      guestCommunicationAllowedCards.set(res[0].allowedCards)
    }
  )
})
