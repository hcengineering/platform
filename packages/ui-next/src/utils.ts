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
import {
  fillDefaults,
  generateId,
  getCurrentAccount,
  type Markup,
  type MarkupBlobRef,
  type Ref,
  SortingOrder
} from '@hcengineering/core'
import { markupToJSON, jsonToMarkup, markupToText } from '@hcengineering/text'
import { showPopup } from '@hcengineering/ui'
import { markupToMarkdown, markdownToMarkup } from '@hcengineering/text-markdown'
import { type Message } from '@hcengineering/communication-types'
import { getClient, getCommunicationClient } from '@hcengineering/presentation'
import { employeeByPersonIdStore } from '@hcengineering/contact-resources'
import cardPlugin, { type Card } from '@hcengineering/card'
import { openDoc } from '@hcengineering/view-resources'
import { getEmployeeBySocialId } from '@hcengineering/contact'
import { get } from 'svelte/store'
import chat from '@hcengineering/chat'
import { makeRank } from '@hcengineering/rank'
import emojiPlugin from '@hcengineering/emoji'

import IconAt from './components/icons/IconAt.svelte'
import { type TextInputAction } from './types'
import uiNext from './plugin'

export const defaultMessageInputActions: TextInputAction[] = [
  {
    label: uiNext.string.Emoji,
    icon: emojiPlugin.icon.Emoji,
    action: (element, editorHandler) => {
      showPopup(
        emojiPlugin.component.EmojiPopup,
        {},
        element,
        (emoji) => {
          if (emoji === null || emoji === undefined) {
            return
          }

          editorHandler.insertEmoji(emoji.text, emoji.image)
          editorHandler.focus()
        },
        () => {}
      )
    },
    order: 3000
  },
  {
    label: uiNext.string.Mention,
    icon: IconAt,
    action: (_element, editorHandler) => {
      editorHandler.insertText('@')
      editorHandler.focus()
    },
    order: 4000
  }
]

export function toMarkdown (markup: Markup): string {
  return markupToMarkdown(markupToJSON(markup))
}

export function toMarkup (markdown: string): Markup {
  return jsonToMarkup(markdownToMarkup(markdown))
}

export async function toggleReaction (message: Message, emoji: string): Promise<void> {
  const me = getCurrentAccount()
  const communicationClient = getCommunicationClient()
  const { socialIds } = me
  const reaction = message.reactions.find((it) => it.reaction === emoji && socialIds.includes(it.creator))
  if (reaction !== undefined) {
    await communicationClient.removeReaction(message.card, message.id, message.created, emoji)
  } else {
    await communicationClient.createReaction(message.card, message.id, message.created, emoji)
  }
}

export async function replyToThread (message: Message, parentCard: Card): Promise<void> {
  const client = getClient()
  const communicationClient = getCommunicationClient()
  const hierarchy = client.getHierarchy()

  const thread = message.thread
  if (thread != null) {
    const _id = thread.thread
    const card = await client.findOne(cardPlugin.class.Card, { _id: _id as Ref<Card> })
    if (card === undefined) return
    await openDoc(client.getHierarchy(), card)
    return
  }

  const author =
    get(employeeByPersonIdStore).get(message.creator) ?? (await getEmployeeBySocialId(client, message.creator))
  const lastOne = await client.findOne(cardPlugin.class.Card, {}, { sort: { rank: SortingOrder.Descending } })
  const title = createThreadTitle(message, parentCard)
  const data = fillDefaults(
    hierarchy,
    {
      title,
      rank: makeRank(lastOne?.rank, undefined),
      content: '' as MarkupBlobRef,
      parent: parentCard._id
    },
    chat.masterTag.Thread
  )
  const apply = client.apply('create thread', undefined, true)
  const threadCardID = generateId<Card>()
  await apply.createDoc(chat.masterTag.Thread, cardPlugin.space.Default, data, threadCardID)
  await apply.commit()
  await communicationClient.createThread(
    parentCard._id,
    message.id,
    message.created,
    threadCardID,
    chat.masterTag.Thread
  )
  if (author?.active === true && author?.personUuid !== undefined) {
    await communicationClient.addCollaborators(threadCardID, chat.masterTag.Thread, [author.personUuid])
  }
  const threadCard = await client.findOne(cardPlugin.class.Card, { _id: threadCardID })
  if (threadCard === undefined) return
  await openDoc(client.getHierarchy(), threadCard)
}

function createThreadTitle (message: Message, parent: Card): string {
  const markup = jsonToMarkup(markdownToMarkup(message.content))
  const messageText = markupToText(markup).trim()

  const titleFromMessage = `${messageText.slice(0, 100)}${messageText.length > 100 ? '...' : ''}`
  return titleFromMessage.length > 0 ? titleFromMessage : `Thread from ${parent.title}`
}

export function isMessageEmpty (message: Message): boolean {
  return (
    message.content.trim() === '' &&
    message.files.length === 0 &&
    message.reactions.length === 0 &&
    message.thread == null &&
    message.edited == null
  )
}
