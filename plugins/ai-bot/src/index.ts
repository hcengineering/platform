//
// Copyright © 2024 Hardcore Engineering Inc.
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
import { type PersonId, buildSocialIdString, type Mixin, type Ref, SocialIdType, PersonUuid } from '@hcengineering/core'
import type { Metadata, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { ChatMessage } from '@hcengineering/chunter'

export * from './types'
export * from './rest'

export const aiBotId = 'ai-bot' as Plugin

export const aiBotAccountEmail = 'huly.ai.bot@hc.engineering'
export const aiBotEmailSocialId = buildSocialIdString({
  type: SocialIdType.EMAIL,
  value: aiBotAccountEmail
})
export const aiBotAccount = '5a1a5faa-582c-42a6-8613-fc80a15e3ae8' as PersonUuid

export interface TransferredMessage extends ChatMessage {
  messageId: Ref<ChatMessage>
  parentMessageId?: Ref<ChatMessage>
}

const aiBot = plugin(aiBotId, {
  metadata: {
    EndpointURL: '' as Metadata<string>
  },
  mixin: {
    TransferredMessage: '' as Ref<Mixin<TransferredMessage>>
  },
  account: {
    AIBot: '' as PersonId
  }
})

export default aiBot
