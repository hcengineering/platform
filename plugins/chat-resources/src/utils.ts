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

import { markdownToMarkup } from '@hcengineering/text-markdown'
import { type Message } from '@hcengineering/communication-types'
import { type Card } from '@hcengineering/card'
import { jsonToMarkup, markupToText } from '@hcengineering/text'

export function createThreadTitle (message: Message, parent: Card): string {
  const markup = jsonToMarkup(markdownToMarkup(message.content))
  const messageText = markupToText(markup).trim()

  const titleFromMessage = `${messageText.slice(0, 100)}${messageText.length > 100 ? '...' : ''}`
  return titleFromMessage.length > 0 ? titleFromMessage : `Thread from ${parent.title}`
}
