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

import {
  canDisplayLinkPreview,
  fetchLinkPreviewDetails,
  getClient,
  getCommunicationClient
} from '@hcengineering/presentation'
import cardPlugin, { type Card } from '@hcengineering/card'
import {
  fillDefaults,
  generateId,
  getCurrentAccount,
  type Markup,
  type MarkupBlobRef,
  type Ref,
  SortingOrder
} from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { showPopup } from '@hcengineering/ui'
import { employeeByPersonIdStore } from '@hcengineering/contact-resources'
import { getEmployeeBySocialId } from '@hcengineering/contact'
import { type LinkPreviewData, type Message } from '@hcengineering/communication-types'
import emoji from '@hcengineering/emoji'
import { markdownToMarkup, markupToMarkdown } from '@hcengineering/text-markdown'
import { jsonToMarkup, markupToJSON, markupToText } from '@hcengineering/text'
import { get } from 'svelte/store'
import chat from '@hcengineering/chat'
import { openDoc } from '@hcengineering/view-resources'
import { makeRank } from '@hcengineering/rank'

import IconAt from './components/icons/At.svelte'

import communication from './plugin'
import { type TextInputAction } from './types'

export async function unsubscribe (card: Card): Promise<void> {
  const client = getCommunicationClient()
  const me = getCurrentAccount()
  await client.removeCollaborators(card._id, card._class, [me.uuid])
}

export async function subscribe (card: Card): Promise<void> {
  const client = getCommunicationClient()
  const me = getCurrentAccount()
  await client.addCollaborators(card._id, card._class, [me.uuid])
}

export async function canSubscribe (card: Card): Promise<boolean> {
  const isEnabled = getMetadata(communication.metadata.Enabled) === true
  if (!isEnabled) return false
  const client = getCommunicationClient()
  const me = getCurrentAccount()
  const collaborator = (await client.findCollaborators({ card: card._id, account: me.uuid, limit: 1 }))[0]
  return collaborator === undefined
}

export async function canUnsubscribe (card: Card): Promise<boolean> {
  const isEnabled = getMetadata(communication.metadata.Enabled) === true
  if (!isEnabled) return false
  const client = getCommunicationClient()
  const me = getCurrentAccount()
  const collaborator = (await client.findCollaborators({ card: card._id, account: me.uuid, limit: 1 }))[0]
  return collaborator !== undefined
}

export const defaultMessageInputActions: TextInputAction[] = [
  {
    label: communication.string.Emoji,
    icon: emoji.icon.Emoji,
    action: (element, editorHandler) => {
      showPopup(
        emoji.component.EmojiPopup,
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
    label: communication.string.Mention,
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
    await communicationClient.removeReaction(message.cardId, message.id, emoji)
  } else {
    await communicationClient.setReaction(message.cardId, message.id, emoji)
  }
}

export async function replyToThread (message: Message, parentCard: Card): Promise<void> {
  const client = getClient()
  const communicationClient = getCommunicationClient()
  const hierarchy = client.getHierarchy()

  const thread = message.thread
  if (thread != null) {
    const _id = thread.threadId
    const card = await client.findOne(cardPlugin.class.Card, { _id: _id as Ref<Card> })
    if (card === undefined) return
    await openDoc(client.getHierarchy(), card)
    return
  }

  const author =
    get(employeeByPersonIdStore).get(message.creator) ?? (await getEmployeeBySocialId(client, message.creator))
  const lastOne = await client.findOne(cardPlugin.class.Card, {}, { sort: { rank: SortingOrder.Descending } })
  const title = createThreadTitle(message, parentCard)
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
    chat.masterTag.Thread
  )
  const apply = client.apply('create thread', undefined, true)
  const threadCardID = generateId<Card>()
  await apply.createDoc(chat.masterTag.Thread, cardPlugin.space.Default, data, threadCardID)
  await apply.commit()
  await communicationClient.attachThread(parentCard._id, message.id, threadCardID, chat.masterTag.Thread)
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

export async function loadLinkPreviewData (url: string): Promise<LinkPreviewData | undefined> {
  try {
    const meta = await fetchLinkPreviewDetails(url)
    if (canDisplayLinkPreview(meta) && meta.url !== undefined && meta.host !== undefined) {
      return {
        url: meta.url,
        host: meta.host,
        siteName: meta.hostname,
        title: meta.title,
        description: meta.description,
        iconUrl: meta.icon,
        previewImage:
          meta.image != null
            ? {
                url: meta.image,
                width: meta.imageWidth,
                height: meta.imageHeight
              }
            : undefined
      }
    }
  } catch (err: any) {
    console.error(err)
  }
}
