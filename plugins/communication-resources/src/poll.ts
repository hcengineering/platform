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
  type Data,
  fillDefaults,
  generateId,
  getCurrentAccount,
  type MarkupBlobRef,
  type Ref,
  SortingOrder,
  type Timestamp
} from '@hcengineering/core'
import { type Poll, type PollAnswer } from '@hcengineering/communication'
import { getClient } from '@hcengineering/presentation'
import card, { type Card } from '@hcengineering/card'
import { makeRank } from '@hcengineering/rank'
import { type AppletAttachment, type MessageID } from '@hcengineering/communication-types'

import communication from './plugin'

// Poll configuration
export interface PollConfig {
  id: Ref<Poll>
  question: string
  options: PollOption[]
  mode: PollMode

  anonymous?: boolean
  quiz?: boolean
  quizAnswer?: string

  startAt?: Timestamp
  endAt?: Timestamp
}

export type PollMode = 'single' | 'multiple'

export interface PollOption {
  id: string
  label: string
}

export function getEmptyPollConfig (): PollConfig {
  return {
    id: generateId<Poll>(),
    question: '',
    options: [
      {
        id: generateId(),
        label: ''
      }
    ],
    mode: 'single',
    anonymous: false,
    quiz: false
  }
}

export async function createPoll (parent: Card, message: MessageID, params: PollConfig): Promise<void> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const lastOne = await client.findOne(card.class.Card, {}, { sort: { rank: SortingOrder.Descending } })

  const data: Data<Poll> = {
    title: params.question,
    rank: makeRank(lastOne?.rank, undefined),
    content: '' as MarkupBlobRef,
    parentInfo: [],
    blobs: {},
    totalVotes: 0,
    messageId: message,
    userVotes: []
  }
  const filledData = fillDefaults(hierarchy, data, communication.type.Poll)

  await client.createDoc(communication.type.Poll, parent.space, filledData, params.id)
}

export function getPollTitle (attachment: AppletAttachment): string {
  const params = attachment.params as PollConfig
  return params.question
}

export function isVotedByMe (result: Poll | undefined, anonymous: boolean = false, answers: PollAnswer[] = []): boolean {
  if (result == null) return false
  if (anonymous) {
    return answers.some((it: PollAnswer) => it.options.length > 0) ?? false
  }
  const me = getCurrentAccount()

  return result.userVotes?.some((it) => it.account === me.uuid && it.options.length > 0) ?? false
}
