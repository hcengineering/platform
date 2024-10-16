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

import { Account, Class, Doc, type Mixin, Ref, Space } from '@hcengineering/core'
import type { IntlString, Metadata, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { ChatMessage } from '@hcengineering/chunter'

export * from './types'

export const aiBotId = 'ai-bot' as Plugin

export const aiBotAccountEmail = 'huly.ai.bot@hc.engineering'

export interface AIBotEvent extends Doc {
  collection: string
  messageClass: Ref<Class<ChatMessage>>
  messageId: Ref<ChatMessage>
  message: string
}

export interface AIBotResponseEvent extends AIBotEvent {
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>
  objectSpace: Ref<Space>
  user: Ref<Account>
  email: string
}

export interface AIBotTransferEvent extends AIBotEvent {
  toEmail: string
  toWorkspace: string
  fromWorkspace: string
  fromWorkspaceName: string
  fromWorkspaceUrl: string
  parentMessageId?: Ref<ChatMessage>
}

export interface TransferredMessage extends ChatMessage {
  messageId: Ref<ChatMessage>
  parentMessageId?: Ref<ChatMessage>
}

const aiBot = plugin(aiBotId, {
  metadata: {
    EndpointURL: '' as Metadata<string>
  },
  class: {
    AIBotEvent: '' as Ref<Class<AIBotEvent>>,
    AIBotTransferEvent: '' as Ref<Class<AIBotTransferEvent>>,
    AIBotResponseEvent: '' as Ref<Class<AIBotResponseEvent>>
  },
  mixin: {
    TransferredMessage: '' as Ref<Mixin<TransferredMessage>>
  },
  account: {
    AIBot: '' as Ref<Account>
  },
  string: {
    Translate: '' as IntlString,
    InstantlyTranslateText: '' as IntlString,
    TranslateHelp: '' as IntlString,
    Where: '' as IntlString,
    CodesHelp: '' as IntlString,
    CantTranslateThisText: '' as IntlString
  }
})

export default aiBot
