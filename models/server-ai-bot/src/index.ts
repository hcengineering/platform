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

import { type Builder, Mixin, Model, Prop, TypeRef, TypeString } from '@hcengineering/model'
import core, { type Account, type Class, type Doc, type Domain, type Ref, type Space } from '@hcengineering/core'
import serverCore from '@hcengineering/server-core'
import serverAiBot from '@hcengineering/server-ai-bot'
import { TDoc } from '@hcengineering/model-core'
import { getEmbeddedLabel } from '@hcengineering/platform'
import aiBot, {
  type AIBotEvent,
  type AIBotTransferEvent,
  type AIBotResponseEvent,
  type TransferredMessage
} from '@hcengineering/ai-bot'
import chunter, { type ChatMessage } from '@hcengineering/chunter'
import notification from '@hcengineering/notification'
import { TChatMessage } from '@hcengineering/model-chunter'

export { serverAiBotId } from '@hcengineering/server-ai-bot'

export const DOMAIN_AI_BOT = 'ai_bot' as Domain

@Model(aiBot.class.AIBotEvent, core.class.Doc, DOMAIN_AI_BOT)
export class TAIBotEvent extends TDoc implements AIBotEvent {
  @Prop(TypeRef(chunter.class.ChatMessage), core.string.Class)
    messageClass!: Ref<Class<ChatMessage>>

  @Prop(TypeRef(chunter.class.ChatMessage), core.string.Ref)
    messageId!: Ref<ChatMessage>

  @Prop(TypeString(), getEmbeddedLabel('Collection'))
    collection!: string

  @Prop(TypeString(), getEmbeddedLabel('Message'))
    message!: string
}

@Model(aiBot.class.AIBotResponseEvent, aiBot.class.AIBotEvent)
export class TAIBotResponseEvent extends TAIBotEvent implements AIBotResponseEvent {
  @Prop(TypeRef(core.class.Doc), core.string.Object)
    objectId!: Ref<Doc>

  @Prop(TypeRef(core.class.Class), core.string.Class)
    objectClass!: Ref<Class<Doc>>

  @Prop(TypeRef(core.class.Space), core.string.Space)
    objectSpace!: Ref<Space>

  @Prop(TypeRef(core.class.Account), core.string.Account)
    user!: Ref<Account>

  email!: string
}

@Model(aiBot.class.AIBotTransferEvent, aiBot.class.AIBotEvent)
export class TAIBotTransferEvent extends TAIBotEvent implements AIBotTransferEvent {
  toEmail!: string
  toWorkspace!: string
  fromWorkspace!: string
  fromWorkspaceName!: string
  fromWorkspaceUrl!: string
  parentMessageId?: Ref<ChatMessage>
}

@Mixin(aiBot.mixin.TransferredMessage, chunter.class.ChatMessage)
export class TTransferredMessage extends TChatMessage implements TransferredMessage {
  messageId!: Ref<ChatMessage>
  parentMessageId?: Ref<ChatMessage>
}

export function createModel (builder: Builder): void {
  builder.createModel(TAIBotEvent, TAIBotTransferEvent, TAIBotResponseEvent, TTransferredMessage)

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverAiBot.trigger.OnMessageSend,
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
