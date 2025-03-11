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

import IconAt from './components/icons/IconAt.svelte'
import IconEmoji from './components/icons/IconEmoji.svelte'
import IconPlus from './components/icons/IconPlus.svelte'
import IconTextFont from './components/icons/IconTextFont.svelte'
import { type TextInputAction } from './types'
import uiNext from './plugin'

export const defaultMessageInputActions: TextInputAction[] = [
  {
    label: uiNext.string.Attach,
    icon: IconPlus,
    action: (_element, editorHandler) => {
      // TODO: implement
    },
    order: 1000
  },
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
