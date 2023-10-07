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

import activity from '@hcengineering/activity'
import { Channel } from '@hcengineering/contact'
import { Class, Domain, IndexKind, Ref, Timestamp, Type } from '@hcengineering/core'
import {
  ArrOf,
  Builder,
  Collection,
  Index,
  Model,
  Prop,
  TypeBoolean,
  TypeString,
  TypeTimestamp
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import contact from '@hcengineering/model-contact'
import core, { TAttachedDoc } from '@hcengineering/model-core'
import setting from '@hcengineering/setting'
import type {
  NewTelegramMessage,
  SharedTelegramMessage,
  SharedTelegramMessages,
  TelegramMessage
} from '@hcengineering/telegram'
import templates from '@hcengineering/templates'
import view from '@hcengineering/view'
import telegram from './plugin'
import notification from '@hcengineering/model-notification'

export { telegramId } from '@hcengineering/telegram'
export { telegramOperation } from './migration'
export { default } from './plugin'

export const DOMAIN_TELEGRAM = 'telegram' as Domain

function TypeSharedMessage (): Type<SharedTelegramMessage> {
  return { _class: telegram.class.SharedMessage, label: telegram.string.SharedMessage }
}

@Model(telegram.class.Message, core.class.AttachedDoc, DOMAIN_TELEGRAM)
export class TTelegramMessage extends TAttachedDoc implements TelegramMessage {
  declare attachedTo: Ref<Channel>
  declare attachedToClass: Ref<Class<Channel>>

  @Prop(TypeString(), telegram.string.Content)
  @Index(IndexKind.FullText)
    content!: string

  @Prop(TypeBoolean(), telegram.string.Incoming)
    incoming!: boolean

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(TypeTimestamp(), core.string.Modified)
    sendOn!: Timestamp
}

@Model(telegram.class.NewMessage, core.class.AttachedDoc, DOMAIN_TELEGRAM)
export class TNewTelegramMessage extends TAttachedDoc implements NewTelegramMessage {
  @Prop(TypeString(), telegram.string.Content)
  @Index(IndexKind.FullText)
    content!: string

  @Prop(TypeString(), telegram.string.Status)
    status!: 'new' | 'sent'

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number
}

@Model(telegram.class.SharedMessages, core.class.AttachedDoc, DOMAIN_TELEGRAM)
export class TSharedTelegramMessages extends TAttachedDoc implements SharedTelegramMessages {
  @Prop(ArrOf(TypeSharedMessage()), telegram.string.Messages)
    messages!: SharedTelegramMessage[]
}

export function createModel (builder: Builder): void {
  builder.createModel(TTelegramMessage, TSharedTelegramMessages, TNewTelegramMessage)

  builder.mixin(telegram.class.Message, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: telegram.component.MessagePresenter
  })

  builder.createDoc(
    templates.class.TemplateField,
    core.space.Model,
    {
      label: telegram.string.Telegram,
      category: contact.templateFieldCategory.CurrentEmployee,
      func: telegram.function.GetCurrentEmployeeTG
    },
    telegram.templateField.CurrentEmployeeTelegram
  )

  builder.createDoc(
    templates.class.TemplateField,
    core.space.Model,
    {
      label: telegram.string.Telegram,
      category: setting.templateFieldCategory.Integration,
      func: telegram.function.GetIntegrationOwnerTG
    },
    telegram.templateField.IntegrationOwnerTG
  )

  builder.createDoc(
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: telegram.class.Message,
      icon: contact.icon.Telegram,
      txClass: core.class.TxCreateDoc,
      component: telegram.activity.TxMessage,
      display: 'inline'
    },
    telegram.ids.TxMessage
  )

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
      allowMultiple: false,
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
      display: 'content',
      editable: true,
      hideOnRemove: true
    },
    telegram.ids.TxSharedCreate
  )

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: telegram.string.Telegram,
      icon: contact.icon.Telegram
    },
    telegram.ids.NotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: telegram.string.NewMessage,
      generated: false,
      allowedForAuthor: true,
      hidden: false,
      txClasses: [core.class.TxCreateDoc],
      objectClass: telegram.class.Message,
      group: telegram.ids.NotificationGroup,
      providers: {
        [notification.providers.PlatformNotification]: true
      }
    },
    telegram.ids.NewMessageNotification
  )

  builder.createDoc(
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: telegram.class.Message,
      icon: contact.icon.Telegram,
      txClass: core.class.TxCreateDoc,
      match: {
        'attributes.incoming': true
      },
      label: telegram.string.NewIncomingMessage,
      display: 'inline',
      editable: false,
      hideOnRemove: true
    },
    telegram.ids.NewMessageNotificationViewlet
  )

  builder.mixin(telegram.class.Message, core.class.Class, core.mixin.FullTextSearchContext, {
    parentPropagate: false
  })
}
