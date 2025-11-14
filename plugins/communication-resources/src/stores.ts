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

import { get, writable, derived } from 'svelte/store'
import { createLabelsQuery, createQuery, onClient, onCommunicationClient } from '@hcengineering/presentation'
import {
  MessageType,
  type CardID,
  type Label,
  type LabelID,
  type Message,
  type MessageID
} from '@hcengineering/communication-types'
import core, { getCurrentAccount, type Markup, type Ref } from '@hcengineering/core'
import { languageStore } from '@hcengineering/ui'
import cardPlugin, { type Card } from '@hcengineering/card'
import communication from '@hcengineering/communication'
import { translationStore } from '@hcengineering/contact-resources'

import { toMarkup } from './utils'

export const labelsStore = writable<Label[]>([])
export const messageEditingStore = writable<MessageID | undefined>(undefined)
export const translateMessagesStore = writable<TranslateMessagesStatus[]>([])
export const showOriginalMessagesStore = writable<Array<[CardID, MessageID]>>([])
export const threadCreateMessageStore = writable<Message | undefined>(undefined)
export const guestCommunicationAllowedCards = writable<Array<Ref<Card>>>([])

export const translateToStore = derived(translationStore, (translation) =>
  translation?.enabled === true ? translation.translateTo : undefined
)

export const dontTranslateStore = derived(translationStore, (translation) =>
  translation?.enabled === true ? translation.dontTranslate : []
)

export interface TranslateMessagesStatus {
  cardId: CardID
  messageId: MessageID
  inProgress: boolean
  result?: Markup
}

languageStore.subscribe(() => {
  translateMessagesStore.set([])
})

export function isMessageManualTranslated (cardId: CardID, messageId: MessageID): boolean {
  return get(translateMessagesStore).find((it) => it.cardId === cardId && messageId === it.messageId)?.result != null
}

export function isMessageManualTranslating (cardId: CardID, messageId: MessageID): boolean {
  return (
    get(translateMessagesStore).find((it) => it.cardId === cardId && messageId === it.messageId)?.inProgress === true
  )
}

export function isShownManualTranslatedMessage (cardId: CardID, messageId: MessageID): boolean {
  const result = get(translateMessagesStore).find((it) => it.cardId === cardId && messageId === it.messageId)
  const showOriginal = get(showOriginalMessagesStore).some(([cId, mId]) => cId === cardId && mId === messageId)
  return !showOriginal && result?.result != null
}

export function hasTranslate (
  message: Message,
  translateTo: string | undefined,
  dontTranslate: string[],
  translatedMessages: TranslateMessagesStatus[]
): boolean {
  if (message.type !== MessageType.Text) return false
  const manualTranslate = translatedMessages.find((it) => it.cardId === message.cardId && it.messageId === message.id)
  if (manualTranslate?.result != null) return true

  const me = getCurrentAccount()
  if (me.socialIds.includes(message.creator)) return false

  if (translateTo == null || translateTo === '') return false
  if (message.language != null && dontTranslate.includes(message.language)) return false
  const translated = message.translates?.[translateTo]
  const res = typeof translated === 'string' ? translated.trim() : ''

  return res !== ''
}

export function isMessageTranslated (
  message: Message,
  translateTo: string | undefined,
  dontTranslate: string[],
  translatedMessages: TranslateMessagesStatus[],
  showOriginalMessage: Array<[CardID, MessageID]>
): boolean {
  const showOriginal = showOriginalMessage.some(([cId, mId]) => cId === message.cardId && mId === message.id)
  if (showOriginal) return false

  return hasTranslate(message, translateTo, dontTranslate, translatedMessages)
}

export function isMessageOriginalShown (
  message: Message,
  translateTo: string | undefined,
  dontTranslate: string[],
  translatedMessages: TranslateMessagesStatus[],
  showOriginalMessage: Array<[CardID, MessageID]>
): boolean {
  const showOriginal = showOriginalMessage.some(([cId, mId]) => cId === message.cardId && mId === message.id)
  if (!showOriginal) return false

  return hasTranslate(message, translateTo, dontTranslate, translatedMessages)
}

export function getMessageTranslation (
  message: Message,
  translateTo: string | undefined,
  dontTranslate: string[],
  translatedMessages: TranslateMessagesStatus[],
  showOriginalMessage: Array<[CardID, MessageID]>
): Markup | undefined {
  if (message.type !== MessageType.Text) return undefined
  const showOriginal = showOriginalMessage.some(([cId, mId]) => cId === message.cardId && mId === message.id)

  if (showOriginal) return undefined

  const manualTranslate = translatedMessages.find((it) => it.cardId === message.cardId && it.messageId === message.id)

  if (manualTranslate?.result != null) return manualTranslate.result

  const me = getCurrentAccount()
  if (me.socialIds.includes(message.creator)) return undefined

  if (translateTo == null || translateTo === '') return undefined
  if (message.language != null && dontTranslate.includes(message.language)) return undefined
  const translated = message.translates?.[translateTo]
  const res = typeof translated === 'string' ? translated.trim() : ''

  return res !== '' ? toMarkup(res) : undefined
}

export function isCardSubscribed (cardId: Ref<Card>): boolean {
  const me = getCurrentAccount()
  const labelId = cardPlugin.label.Subscribed as string as LabelID
  return get(labelsStore).some((it) => it.account === me.uuid && it.cardId === cardId && it.labelId === labelId)
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
