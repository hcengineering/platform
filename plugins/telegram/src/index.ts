//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import type { Account, AttachedDoc, Class, Doc, Ref, Timestamp } from '@hcengineering/core'
import { NotificationType } from '@hcengineering/notification'
import type { Plugin } from '@hcengineering/platform'
import { Metadata, plugin } from '@hcengineering/platform'
import type { Handler, IntegrationType } from '@hcengineering/setting'
import { TemplateField } from '@hcengineering/templates'
import type { AnyComponent } from '@hcengineering/ui'
import { ExternalChatMessage } from '@hcengineering/chunter'
import { ChannelMessage, Channel } from '@hcengineering/contact'

export enum TelegramMessageStatus {
  New = 'new',
  Sent = 'sent',
  Incoming = 'incoming'
}

export interface TelegramChatMessage extends ExternalChatMessage {}

export interface TelegramChannelMessage extends ChannelMessage {
  status: TelegramMessageStatus
  history: boolean
  receiver?: Ref<Account>
  telegramId?: number
}

/**
 * @public
 */
export interface SharedTelegramMessage extends Doc {
  attachedTo: Ref<Channel>
  attachedToClass: Ref<Class<Channel>>

  attachments?: number
  content: string
  editedOn?: Timestamp

  status: TelegramMessageStatus
  history: boolean
  telegramId?: number
  sender: string
}

/**
 * @public
 */
export interface SharedTelegramMessages extends AttachedDoc {
  messages: SharedTelegramMessage[]
}

/**
 * @public
 */
export const telegramId = 'telegram' as Plugin

export default plugin(telegramId, {
  component: {
    Chat: '' as AnyComponent,
    Connect: '' as AnyComponent,
    Reconnect: '' as AnyComponent,
    IconTelegram: '' as AnyComponent,
    SharedMessages: '' as AnyComponent
  },
  integrationType: {
    Telegram: '' as Ref<IntegrationType>
  },
  handler: {
    DisconnectHandler: '' as Handler
  },
  ids: {
    NewMessageNotification: '' as Ref<NotificationType>
  },
  class: {
    TelegramChatMessage: '' as Ref<Class<TelegramChatMessage>>,
    TelegramChannelMessage: '' as Ref<Class<TelegramChannelMessage>>,
    SharedMessage: '' as Ref<Class<SharedTelegramMessage>>,
    SharedMessages: '' as Ref<Class<SharedTelegramMessages>>
  },
  templateField: {
    CurrentEmployeeTelegram: '' as Ref<TemplateField>,
    IntegrationOwnerTG: '' as Ref<TemplateField>
  },
  metadata: {
    TelegramURL: '' as Metadata<string>
  }
})
