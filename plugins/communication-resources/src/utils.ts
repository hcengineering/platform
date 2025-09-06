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
import { type Card } from '@hcengineering/card'
import { AccountRole, type Data, getCurrentAccount, type Ref, type Space, type Markup } from '@hcengineering/core'
import { getMetadata, translate } from '@hcengineering/platform'
import { addNotification, languageStore, NotificationSeverity, showPopup } from '@hcengineering/ui'
import { type LinkPreviewParams, type Message } from '@hcengineering/communication-types'
import emoji from '@hcengineering/emoji'
import { markdownToMarkup, markupToMarkdown } from '@hcengineering/text-markdown'
import { jsonToMarkup, markupToJSON } from '@hcengineering/text'

import IconAt from './components/icons/At.svelte'

import communication from './plugin'
import { type TextInputAction } from './types'
import { guestCommunicationAllowedCards } from './stores'
import { get } from 'svelte/store'
import view from '@hcengineering/view'
import { type Direct } from '@hcengineering/communication'
import { type Employee } from '@hcengineering/contact'

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
    await communicationClient.addReaction(message.cardId, message.id, emoji)
  }
}

export async function loadLinkPreviewParams (url: string): Promise<LinkPreviewParams | undefined> {
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

export function isCardAllowedForCommunications (card: Card): boolean {
  if (getCurrentAccount().role !== AccountRole.Guest) return true
  const allowedCards = get(guestCommunicationAllowedCards)
  if (allowedCards.includes(card._id)) return true
  for (const parentInfoElement of card.parentInfo) {
    if (allowedCards.includes(parentInfoElement._id)) return true
  }
  return false
}

export async function showForbidden (): Promise<void> {
  const lang = get(languageStore)
  addNotification(
    await translate(view.string.PermissionWarningTitle, {}, lang),
    await translate(view.string.PermissionWarningMessage, {}, lang),
    view.component.ForbiddenNotification,
    {
      onClose: () => {}
    },
    NotificationSeverity.Info
  )
}

export async function canCreateDirect (space: Ref<Space>, data: Partial<Data<Direct>>): Promise<boolean | Ref<Card>> {
  const members = data.members ?? []
  if (members.length === 0) return false

  const client = getClient()

  if (members.length > 2) {
    return true
  }

  const myDirects = await client.findAll<Direct>(communication.type.Direct, { space })
  const direct = myDirects.find((it) => {
    const directMembers = new Set(it.members)
    const createMembers = new Set(members)
    if (directMembers.size !== createMembers.size) return false
    for (const item of directMembers) {
      if (!createMembers.has(item as Ref<Employee>)) return false
    }
    return true
  })

  if (direct != null) {
    return direct._id
  }

  return true
}
