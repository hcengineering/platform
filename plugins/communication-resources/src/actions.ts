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

import communication, {
  type MessageAction,
  type MessageActionFunction,
  type MessageActionVisibilityTester
} from '@hcengineering/communication'
import { languageStore, showPopup } from '@hcengineering/ui'
import emojiPlugin from '@hcengineering/emoji'
import { type Message, MessageType, SortingOrder } from '@hcengineering/communication-types'
import cardPlugin, { type Card, type MasterTag } from '@hcengineering/card'
import { addRefreshListener, getClient, getCommunicationClient } from '@hcengineering/presentation'
import {
  AccountRole,
  fillDefaults,
  generateId,
  getCurrentAccount,
  hasAccountRole,
  type MarkupBlobRef,
  type Ref
} from '@hcengineering/core'
import { getMetadata, getResource } from '@hcengineering/platform'
import { employeeByPersonIdStore } from '@hcengineering/contact-resources'
import { getEmployeeBySocialId } from '@hcengineering/contact'
import { makeRank } from '@hcengineering/rank'
import chat from '@hcengineering/chat'
import { markupToText } from '@hcengineering/text'
import { get } from 'svelte/store'
import { translate as aiTranslate } from '@hcengineering/ai-bot-resources'
import aiBot from '@hcengineering/ai-bot'
import CreateCardFromMessagePopup from './components/CreateCardFromMessagePopup.svelte'

import { isCardAllowedForCommunications, showForbidden, toggleReaction, toMarkup } from './utils'
import { isMessageTranslating, messageEditingStore, threadCreateMessageStore, translateMessagesStore } from './stores'

export const addReaction: MessageActionFunction = async (message, card: Card, evt, onOpen, onClose) => {
  if (!isCardAllowedForCommunications(card)) {
    await showForbidden()
    return
  }

  if (onOpen !== undefined) onOpen()

  showPopup(
    emojiPlugin.component.EmojiPopup,
    {},
    evt?.target as HTMLElement,
    async (result) => {
      if (onClose !== undefined) onClose()
      const emoji = result?.text
      if (emoji == null) return

      await toggleReaction(message, emoji)
    },
    () => {}
  )
}

export const replyInThread: MessageActionFunction = async (message: Message, parentCard: Card): Promise<void> => {
  if (!isCardAllowedForCommunications(parentCard)) {
    await showForbidden()
    return
  }
  await attachCardToMessage(message, parentCard, createThreadTitle(message, parentCard), chat.masterTag.Thread)
}

export async function attachCardToMessage (
  message: Message,
  parentCard: Card,
  title: string,
  type: Ref<MasterTag>
): Promise<void> {
  const client = getClient()
  const communicationClient = getCommunicationClient()
  const hierarchy = client.getHierarchy()

  const thread = message.thread
  if (thread != null) {
    const _id = thread.threadId
    const card = await client.findOne(cardPlugin.class.Card, { _id: _id as Ref<Card> })
    if (card === undefined) return
    const r = await getResource(cardPlugin.function.OpenCardInSidebar)
    await r(_id, card)
    return
  }

  const threadCardID = generateId<Card>()

  await communicationClient.attachThread(parentCard._id, message.id, threadCardID, type)

  const author =
    get(employeeByPersonIdStore).get(message.creator) ?? (await getEmployeeBySocialId(client, message.creator))
  const lastOne = await client.findOne(cardPlugin.class.Card, {}, { sort: { rank: SortingOrder.Descending } })
  const data = fillDefaults<Card>(
    hierarchy,
    {
      title,
      rank: makeRank(lastOne?.rank, undefined),
      content: '' as MarkupBlobRef,
      parent: parentCard._id,
      blobs: {},
      parentInfo: [
        ...(parentCard.parentInfo ?? []),
        {
          _id: parentCard._id,
          _class: parentCard._class,
          title: parentCard.title
        }
      ]
    },
    type
  )
  await client.createDoc(type, parentCard.space, data, threadCardID)

  if (author?.active === true && author?.personUuid !== undefined) {
    await communicationClient.addCollaborators(threadCardID, type, [author.personUuid])
  }
  const threadCard = await client.findOne(cardPlugin.class.Card, { _id: threadCardID })
  if (threadCard === undefined) return
  const r = await getResource(cardPlugin.function.OpenCardInSidebar)
  await r(threadCard._id, threadCard)
}

function createThreadTitle (message: Message, parent: Card): string {
  const markup = toMarkup(message.content)
  const messageText = markupToText(markup).trim()

  return messageText.length > 0 ? messageText : `Thread from ${parent.title}`
}

export const canReplyInThread: MessageActionVisibilityTester = (message: Message): boolean => {
  return (
    message.type === MessageType.Message &&
    message.extra?.threadRoot !== true &&
    (!message.removed || message.thread != null)
  )
}

export const translateMessage: MessageActionFunction = async (message: Message): Promise<void> => {
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

export const canTranslateMessage: MessageActionVisibilityTester = (message: Message): boolean => {
  const url = getMetadata(aiBot.metadata.EndpointURL) ?? ''
  if (url === '') return false
  return message.type === MessageType.Message && !message.removed
}

export const showOriginalMessage: MessageActionFunction = async (message: Message): Promise<void> => {
  const messageId = message.id
  translateMessagesStore.update((store) => {
    const status = store.get(messageId)
    if (status == null) return store
    store.set(messageId, { ...status, shown: false })
    return store
  })
}

export const canShowOriginalMessage: MessageActionVisibilityTester = (message: Message): boolean => {
  return canTranslateMessage(message)
}

export const editMessage: MessageActionFunction = async (message: Message): Promise<void> => {
  messageEditingStore.set(message.id)
}

export const canEditMessage: MessageActionVisibilityTester = (message: Message): boolean => {
  if (message.type !== MessageType.Message || message.removed) return false
  const me = getCurrentAccount()
  return me.socialIds.includes(message.creator)
}

export const removeMessage: MessageActionFunction = async (message: Message): Promise<void> => {
  const communicationClient = getCommunicationClient()
  message.removed = true
  await communicationClient.removeMessage(message.cardId, message.id)
}

export const canRemoveMessage: MessageActionVisibilityTester = (message: Message): boolean => {
  if (message.type !== MessageType.Message || message.removed) return false
  const me = getCurrentAccount()
  return me.socialIds.includes(message.creator)
}

export const createCard: MessageActionFunction = async (message: Message, card: Card): Promise<void> => {
  if (!hasAccountRole(getCurrentAccount(), AccountRole.User)) {
    await showForbidden()
    return
  }
  threadCreateMessageStore.set(message)
  showPopup(CreateCardFromMessagePopup, { message, card }, undefined, () => {
    threadCreateMessageStore.set(undefined)
  })
}

export const canCreateCard: MessageActionVisibilityTester = (message: Message): boolean => {
  return canReplyInThread(message) && message.thread == null
}

let allMessageActions: MessageAction[] | undefined

addRefreshListener(() => {
  allMessageActions = undefined
})

export async function getMessageActions (message: Message): Promise<MessageAction[]> {
  const client = getClient()
  const actions: MessageAction[] =
    allMessageActions ?? client.getModel().findAllSync(communication.class.MessageAction, {})

  if (allMessageActions === undefined) {
    allMessageActions = actions
  }

  const filteredActions = await filterActions(message, actions)

  return filteredActions.sort((a, b) => a.order - b.order)
}

async function filterActions (message: Message, actions: MessageAction[]): Promise<MessageAction[]> {
  const result: MessageAction[] = []
  for (const action of actions) {
    if (action.visibilityTester == null) {
      result.push(action)
    } else {
      const visibilityTester = await getResource(action.visibilityTester)

      if (visibilityTester(message)) {
        result.push(action)
      }
    }
  }

  return result
}
