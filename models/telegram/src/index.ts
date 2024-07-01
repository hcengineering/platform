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
import { type Account, type Class, type Domain, type Ref, type Type } from '@hcengineering/core'
import { ArrOf, type Builder, Model, Prop, TypeBoolean, TypeString, UX } from '@hcengineering/model'
import contact, { TChannelMessage } from '@hcengineering/model-contact'
import core, { TAttachedDoc } from '@hcengineering/model-core'
import setting from '@hcengineering/setting'
import type {
  SharedTelegramMessage,
  SharedTelegramMessages,
  TelegramChannelMessage,
  TelegramChatMessage,
  TelegramMessageStatus
} from '@hcengineering/telegram'
import templates from '@hcengineering/templates'
import view from '@hcengineering/view'
import chunter, { TExternalChatMessage } from '@hcengineering/model-chunter'

import telegram from './plugin'

export { telegramId } from '@hcengineering/telegram'
export { telegramOperation } from './migration'
export { default } from './plugin'

export const DOMAIN_TELEGRAM = 'telegram' as Domain

function TypeSharedMessage (): Type<SharedTelegramMessage> {
  return { _class: telegram.class.SharedMessage, label: telegram.string.SharedMessage }
}

@Model(telegram.class.TelegramChatMessage, chunter.class.ExternalChatMessage)
export class TTelegramChatMessage extends TExternalChatMessage implements TelegramChatMessage {
  declare channelMessage: Ref<TelegramChannelMessage>
  declare channelMessageClass: Ref<Class<TelegramChannelMessage>>
}

@Model(telegram.class.TelegramChannelMessage, contact.class.ChannelMessage)
export class TTelegramChannelMessage extends TChannelMessage implements TelegramChannelMessage {
  @Prop(TypeString(), telegram.string.Status)
    status!: TelegramMessageStatus

  @Prop(TypeBoolean(), core.string.Boolean)
    history!: boolean

  receiver?: Ref<Account>

  telegramId?: number
}

@Model(telegram.class.SharedMessages, core.class.AttachedDoc, DOMAIN_TELEGRAM)
@UX(telegram.string.SharedMessages)
export class TSharedTelegramMessages extends TAttachedDoc implements SharedTelegramMessages {
  @Prop(ArrOf(TypeSharedMessage()), telegram.string.Messages)
    messages!: SharedTelegramMessage[]
}

export function createModel (builder: Builder): void {
  builder.createModel(TTelegramChatMessage, TTelegramChannelMessage, TSharedTelegramMessages)

  builder.mixin(telegram.class.TelegramChatMessage, core.class.Class, view.mixin.ObjectPresenter, {
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
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: telegram.class.SharedMessages,
      action: 'create',
      icon: contact.icon.Telegram,
      component: telegram.component.SharedMessages,
      label: telegram.string.SharedMessages,
      hideIfRemoved: true
    },
    telegram.ids.TelegramMessageSharedActivityViewlet
  )

  builder.mixin(telegram.class.TelegramChannelMessage, core.class.Class, core.mixin.FullTextSearchContext, {
    parentPropagate: false,
    childProcessingAllowed: true
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_TELEGRAM,
    disabled: [
      { _class: 1 },
      { space: 1 },
      { modifiedBy: 1 },
      { attachedToClass: 1 },
      { createdBy: 1 },
      { createdOn: 1 },
      { createdOn: -1 }
    ]
  })

  builder.createDoc(chunter.class.ChatExtension, core.space.Model, {
    type: telegram.integrationType.Telegram,
    messageClass: telegram.class.TelegramChatMessage,
    threadMessageClass: telegram.class.TelegramChatMessage,
    allowedChannelsTypes: [chunter.class.DirectMessage],
    createMessageFn: telegram.function.CreateMessage,
    editMessageFn: telegram.function.EditMessage,
    options: {
      editable: true,
      removable: true,
      attachmentsEditable: false
    }
  })

  builder.mixin(telegram.class.TelegramChatMessage, core.class.Class, activity.mixin.ActivityMessageGroupProvider, {
    fn: telegram.function.CanGroupMessages
  })

  builder.mixin(telegram.class.TelegramChatMessage, core.class.Class, view.mixin.IgnoreActions, {
    actions: [
      activity.ids.AddReactionAction,
      activity.ids.PinMessageAction,
      activity.ids.UnpinMessageAction,
      chunter.action.ReplyToThreadAction
    ]
  })
}
