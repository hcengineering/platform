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

import { AttachedDoc, Ref } from '@hcengineering/core'
import { PersonSpace } from '@hcengineering/contact'
import { AccountID, MessageID } from '@hcengineering/communication-types'
import { Card } from '@hcengineering/card'

export interface PollAnswer extends AttachedDoc<Poll> {
  options: string[]
  space: Ref<PersonSpace>
}

export interface UserVote {
  account: AccountID
  options: { id: string, label: string, votedAt: Date }[]
}

export interface Poll extends Card {
  messageId: MessageID
  totalVotes: number

  userVotes?: UserVote[]
}
