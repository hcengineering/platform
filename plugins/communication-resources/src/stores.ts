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
import { createLabelsQuery, onCommunicationClient } from '@hcengineering/presentation'
import type { Label, Message, MessageID } from '@hcengineering/communication-types'
import type { Markup } from '@hcengineering/core'
import { languageStore } from '@hcengineering/ui'
import { translate as aiTranslate } from '@hcengineering/ai-bot-resources'
import { toMarkup } from './utils'

export const labelsStore = writable<Label[]>([])

export const translateMessagesStore = writable<Map<MessageID, TranslateMessagesStatus>>(new Map())

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

export async function translateMessage (message: Message): Promise<void> {
  if (isMessageTranslating(message.id)) return
  const result = get(translateMessagesStore).get(message.id)

  if (result?.result != null) {
    translateMessagesStore.update((store) => {
      store.set(message.id, { ...result, shown: true })
      return store
    })
    return
  }

  translateMessagesStore.update((store) => {
    store.set(message.id, { inProgress: true, shown: false })
    return store
  })

  const markup = toMarkup(message.content)
  const response = await aiTranslate(markup, get(languageStore))

  if (response !== undefined) {
    translateMessagesStore.update((store) => {
      store.set(message.id, { inProgress: false, result: response.text, shown: true })
      return store
    })
  } else {
    translateMessagesStore.update((store) => {
      store.delete(message.id)
      return store
    })
  }
}

export function showOriginalMessage (messageId: MessageID): void {
  translateMessagesStore.update((store) => {
    const status = store.get(messageId)
    if (status == null) return store
    store.set(messageId, { ...status, shown: false })
    return store
  })
}

const query = createLabelsQuery(true)

onCommunicationClient(() => {
  query.query({}, (res) => {
    labelsStore.set(res)
  })
})
