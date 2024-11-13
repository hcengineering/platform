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

import { type Builder, Mixin } from '@hcengineering/model'
import core, { type Domain, type Ref } from '@hcengineering/core'
import serverCore from '@hcengineering/server-core'
import serverAiBot from '@hcengineering/server-ai-bot'
import aiBot, { type TransferredMessage } from '@hcengineering/ai-bot'
import chunter, { type ChatMessage } from '@hcengineering/chunter'
import notification from '@hcengineering/notification'
import { TChatMessage } from '@hcengineering/model-chunter'

export { serverAiBotId } from '@hcengineering/server-ai-bot'

export const DOMAIN_AI_BOT = 'ai_bot' as Domain

@Mixin(aiBot.mixin.TransferredMessage, chunter.class.ChatMessage)
export class TTransferredMessage extends TChatMessage implements TransferredMessage {
  messageId!: Ref<ChatMessage>
  parentMessageId?: Ref<ChatMessage>
}

export function createModel (builder: Builder): void {
  builder.createModel(TTransferredMessage)

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverAiBot.trigger.OnMessageSend,
    arrays: true,
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverAiBot.trigger.OnMention,
    txMatch: {
      _class: core.class.TxCreateDoc,
      objectClass: notification.class.MentionInboxNotification
    },
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverAiBot.trigger.OnMessageNotified,
    txMatch: {
      _class: core.class.TxCreateDoc,
      objectClass: notification.class.ActivityInboxNotification
    },
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverAiBot.trigger.OnUserStatus,
    txMatch: {
      objectClass: core.class.UserStatus
    },
    isAsync: true
  })
}
