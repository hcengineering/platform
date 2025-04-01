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
import { EmojiPopup, showPopup } from '@hcengineering/ui'
import { getCurrentAccount, type Markup } from '@hcengineering/core'
import { markupToJSON, jsonToMarkup } from '@hcengineering/text'
import { markupToMarkdown, markdownToMarkup } from '@hcengineering/text-markdown'
import { type Message } from '@hcengineering/communication-types'
import { getCommunicationClient } from '@hcengineering/presentation'

import IconAt from './components/icons/IconAt.svelte'
import IconEmoji from './components/icons/IconEmoji.svelte'
import IconTextFont from './components/icons/IconTextFont.svelte'
import { type TextInputAction } from './types'
import uiNext from './plugin'

export const defaultMessageInputActions: TextInputAction[] = [
  {
    label: uiNext.string.ShowFormatting,
    icon: IconTextFont,
    action: (_element, editorHandler) => {
      // TODO: implement
    },
    order: 2000
  },
  {
    label: uiNext.string.Emoji,
    icon: IconEmoji,
    action: (element, editorHandler) => {
      showPopup(
        EmojiPopup,
        {},
        element,
        (emoji) => {
          if (emoji === null || emoji === undefined) {
            return
          }

          editorHandler.insertText(emoji)
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
    await communicationClient.removeReaction(message.card, message.id, emoji)
  } else {
    await communicationClient.createReaction(message.card, message.id, emoji)
  }
}
