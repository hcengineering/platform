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

import type { IntlString } from '@anticrm/platform'
import { Builder, Model, TypeString, TypeBoolean, Prop, ArrOf, Index } from '@anticrm/model'
import core, { TAttachedDoc } from '@anticrm/model-core'
import contact from '@anticrm/model-contact'
import telegram from './plugin'
import type { TelegramMessage, SharedTelegramMessage, SharedTelegramMessages } from '@anticrm/telegram'
import { Domain, IndexKind, Type } from '@anticrm/core'
import setting from '@anticrm/setting'
import activity from '@anticrm/activity'

export const DOMAIN_TELEGRAM = 'telegram' as Domain

function TypeSharedMessage (): Type<SharedTelegramMessage> {
  return { _class: telegram.class.SharedMessage, label: 'Shared message' as IntlString }
}

@Model(telegram.class.Message, core.class.AttachedDoc, DOMAIN_TELEGRAM)
export class TTelegramMessage extends TAttachedDoc implements TelegramMessage {
  @Prop(TypeString(), 'Content' as IntlString)
  @Index(IndexKind.FullText)
  content!: string

  @Prop(TypeBoolean(), 'Incoming' as IntlString)
  incoming!: boolean
}

@Model(telegram.class.SharedMessages, core.class.AttachedDoc, DOMAIN_TELEGRAM)
export class TSharedTelegramMessages extends TAttachedDoc implements SharedTelegramMessages {
  @Prop(ArrOf(TypeSharedMessage()), 'Messages' as IntlString)
  messages!: SharedTelegramMessage[]
}

export function createModel (builder: Builder): void {
  builder.createModel(TTelegramMessage, TSharedTelegramMessages)

  builder.createDoc(
    contact.class.ChannelProvider,
    core.space.Model,
    {
      label: 'Telegram' as IntlString,
      icon: contact.icon.Telegram,
      placeholder: '@appleseed' as IntlString,
      presenter: telegram.component.Chat,
      integrationType: telegram.integrationType.Telegram
    },
    contact.channelProvider.Telegram
  )

  builder.createDoc(
    setting.class.IntegrationType,
    core.space.Model,
    {
      label: 'Telegram' as IntlString,
      description: 'Use telegram integration' as IntlString,
      icon: telegram.component.IconTelegram,
      createComponent: telegram.component.Connect,
      onDisconnect: telegram.handler.DisconnectHandler
    },
    telegram.integrationType.Telegram
  )

  builder.createDoc(
    core.class.Space,
    core.space.Model,
    {
      name: 'Telegram',
      description: 'Space for all telegram messages',
      private: false,
      archived: false,
      members: []
    },
    telegram.space.Telegram
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
