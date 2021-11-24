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

import type { IntlString } from '@anticrm/platform'
import { Builder, Model, TypeString, TypeBoolean, Prop } from '@anticrm/model'
import core, { TDoc } from '@anticrm/model-core'
import contact from '@anticrm/model-contact'
import telegram from '@anticrm/telegram'
import type { TelegramMessage } from '@anticrm/telegram'
import type { Domain } from '@anticrm/core'
import setting from '@anticrm/setting'

export const DOMAIN_TELEGRAM = 'telegram' as Domain

@Model(telegram.class.Message, core.class.Doc, DOMAIN_TELEGRAM)
export class TTelegramMessage extends TDoc implements TelegramMessage {
  @Prop(TypeString(), 'Content' as IntlString)
  content!: string

  @Prop(TypeString(), 'Phone' as IntlString)
  contactPhone!: string

  @Prop(TypeString(), 'User name' as IntlString)
  contactUserName!: string

  @Prop(TypeBoolean(), 'Incoming' as IntlString)
  incoming!: boolean
}

export function createModel (builder: Builder): void {
  builder.createModel(TTelegramMessage)

  builder.createDoc(contact.class.ChannelProvider, core.space.Model, {
    label: 'Telegram' as IntlString,
    icon: contact.icon.Telegram,
    placeholder: '@appleseed',
    presenter: telegram.component.Chat
  }, telegram.channelProvider.Telegram)

  builder.createDoc(setting.class.IntegrationType, core.space.Model, {
    label: 'Telegram',
    description: 'Use telegram integration' as IntlString,
    icon: telegram.component.IconTelegram,
    createComponent: telegram.component.Connect
  }, telegram.integrationType.Telegram)
}
