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
import { Builder, Model, TypeString, Prop, ArrOf } from '@anticrm/model'
import core, { TAttachedDoc, TDoc } from '@anticrm/model-core'
import contact from '@anticrm/model-contact'
import gmail from './plugin'
import type { Message, SharedMessage, SharedMessages } from '@anticrm/gmail'
import type { Domain, Type } from '@anticrm/core'
import setting from '@anticrm/setting'
import activity from '@anticrm/activity'

export const DOMAIN_GMAIL = 'gmail' as Domain

function TypeSharedMessage (): Type<SharedMessage> {
  return { _class: gmail.class.SharedMessage, label: 'Shared message' as IntlString }
}

@Model(gmail.class.Message, core.class.Doc, DOMAIN_GMAIL)
export class TMessage extends TDoc implements Message {
  @Prop(TypeString(), 'MessageID' as IntlString)
  messageId!: string

  @Prop(TypeString(), 'ReplyTo' as IntlString)
  replyTo?: string

  @Prop(TypeString(), 'From' as IntlString)
  from!: string

  @Prop(TypeString(), 'To' as IntlString)
  to!: string

  @Prop(TypeString(), 'Contact' as IntlString)
  contact!: string

  @Prop(TypeString(), 'Subject' as IntlString)
  subject!: string

  @Prop(TypeString(), 'Message' as IntlString)
  content!: string

  @Prop(TypeString(), 'Message' as IntlString)
  textContent!: string

  @Prop(ArrOf(TypeString()), 'Copy' as IntlString)
  copy?: string[]
}

@Model(gmail.class.SharedMessages, core.class.AttachedDoc, DOMAIN_GMAIL)
export class TSharedMessages extends TAttachedDoc implements SharedMessages {
  @Prop(ArrOf(TypeSharedMessage()), 'Messages' as IntlString)
  messages!: SharedMessage[]
}

export function createModel (builder: Builder): void {
  builder.createModel(TMessage, TSharedMessages)

  builder.createDoc(
    contact.class.ChannelProvider,
    core.space.Model,
    {
      label: 'Gmail' as IntlString,
      icon: contact.icon.Email,
      placeholder: 'john.appleseed@apple.com',
      presenter: gmail.component.Main,
      integrationType: gmail.integrationType.Gmail
    },
    contact.channelProvider.Email
  )

  builder.createDoc(
    setting.class.IntegrationType,
    core.space.Model,
    {
      label: 'Gmail' as IntlString,
      description: 'Use gmail integration' as IntlString,
      icon: gmail.component.IconGmail,
      createComponent: gmail.component.Connect,
      onDisconnect: gmail.handler.DisconnectHandler
    },
    gmail.integrationType.Gmail
  )

  builder.createDoc(
    core.class.Space,
    core.space.Model,
    {
      name: 'Gmail',
      description: 'Space for all gmail messages',
      private: false,
      archived: false,
      members: []
    },
    gmail.space.Gmail
  )

  builder.createDoc(
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: gmail.class.SharedMessages,
      icon: contact.icon.Telegram,
      txClass: core.class.TxCreateDoc,
      component: gmail.activity.TxSharedCreate,
      label: gmail.string.SharedMessages,
      display: 'content'
    },
    gmail.ids.TxSharedCreate
  )
}
