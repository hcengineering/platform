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

import { type Message } from '@hcengineering/communication-types'
import { getCurrentAccount, type Ref } from '@hcengineering/core'
import { type Card } from '@hcengineering/card'
import type { CommunicationClient } from '@hcengineering/presentation'

import { openThreadInSidebar } from './location'

export async function replyToThread (card: Ref<Card>, message: Message): Promise<void> {
  await openThreadInSidebar(card, message)
}

export async function toggleReaction (
  client: CommunicationClient,
  card: Ref<Card>,
  message: Message,
  emoji: string
): Promise<void> {
  const me = getCurrentAccount()
  const { socialIds } = me
  const reaction = message.reactions.find((it) => it.reaction === emoji && socialIds.includes(it.creator))
  if (reaction !== undefined) {
    await client.removeReaction(card, message.id, emoji)
  } else {
    await client.createReaction(card, message.id, emoji)
  }
}
