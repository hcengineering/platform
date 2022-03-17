//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Builder, Model, TypeString, TypeBoolean, Prop, ArrOf, Index, Collection } from '@anticrm/model'
import core, { TAttachedDoc } from '@anticrm/model-core'
import contact from '@anticrm/model-contact'
import telegram from './plugin'
import type {
  TelegramMessage,
  NewTelegramMessage,
  SharedTelegramMessage,
  SharedTelegramMessages
} from '@anticrm/telegram'
import { Domain, IndexKind, Type } from '@anticrm/core'
import setting from '@anticrm/setting'
import activity from '@anticrm/activity'
import attachment from '@anticrm/model-attachment'

export const DOMAIN_TELEGRAM = 'telegram' as Domain

function TypeSharedMessage (): Type<SharedTelegramMessage> {
  return { _class: telegram.class.SharedMessage, label: telegram.string.SharedMessage }
}

@Model(telegram.class.Message, core.class.AttachedDoc, DOMAIN_TELEGRAM)
export class TTelegramMessage extends TAttachedDoc implements TelegramMessage {
  @Prop(TypeString(), telegram.string.Content)
  @Index(IndexKind.FullText)
  content!: string

  @Prop(TypeBoolean(), telegram.string.Incoming)
  incoming!: boolean

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments)
  attachments?: number
}

@Model(telegram.class.NewMessage, core.class.AttachedDoc, DOMAIN_TELEGRAM)
export class TNewTelegramMessage extends TAttachedDoc implements NewTelegramMessage {
  @Prop(TypeString(), telegram.string.Content)
  @Index(IndexKind.FullText)
  content!: string

  @Prop(TypeString(), telegram.string.Status)
  status!: 'new' | 'sent'

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments)
  attachments?: number
}

@Model(telegram.class.SharedMessages, core.class.AttachedDoc, DOMAIN_TELEGRAM)
export class TSharedTelegramMessages extends TAttachedDoc implements SharedTelegramMessages {
  @Prop(ArrOf(TypeSharedMessage()), telegram.string.Messages)
  messages!: SharedTelegramMessage[]
}

export function createModel (builder: Builder): void {
  builder.createModel(TTelegramMessage, TSharedTelegramMessages, TNewTelegramMessage)

  builder.createDoc(
    contact.class.ChannelProvider,
    core.space.Model,
    {
      label: telegram.string.Telegram,
      icon: contact.icon.Telegram,
      placeholder: contact.string.AtPlaceHolder,
      presenter: telegram.component.Chat,
      integrationType: telegram.integrationType.Telegram
    },
    contact.channelProvider.Telegram
  )

  builder.createDoc(
    setting.class.IntegrationType,
    core.space.Model,
    {
      label: telegram.string.Telegram,
      description: telegram.string.TelegramIntegrationDesc,
      icon: telegram.component.IconTelegram,
      createComponent: telegram.component.Connect,
      reconnectComponent: telegram.component.Reconnect,
      onDisconnect: telegram.handler.DisconnectHandler
    },
    telegram.integrationType.Telegram
  )

  builder.createDoc(
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: telegram.class.SharedMessages,
      icon: contact.icon.Telegram,
      txClass: core.class.TxCreateDoc,
      component: telegram.activity.TxSharedCreate,
      label: telegram.string.SharedMessages,
      display: 'content'
    },
    telegram.ids.TxSharedCreate
  )
}

export { telegramOperation } from './migration'
