//
// Copyright © 2022 Hardcore Engineering Inc.
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
import { type Channel } from '@hcengineering/contact'
import { type Class, type Domain, IndexKind, type Ref, type Timestamp, type Type } from '@hcengineering/core'
import type { Message, NewMessage, SharedMessage, SharedMessages } from '@hcengineering/gmail'
import {
  ArrOf,
  type Builder,
  Collection,
  Index,
  Model,
  Prop,
  TypeBoolean,
  TypeString,
  TypeTimestamp,
  UX
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import contact from '@hcengineering/model-contact'
import core, { TAttachedDoc, TDoc } from '@hcengineering/model-core'
import view, { createAction } from '@hcengineering/model-view'
import setting from '@hcengineering/setting'

import gmail from './plugin'
import { defineNotifications } from './notification'

export { gmailId } from '@hcengineering/gmail'
export { gmailOperation } from './migration'
export { default } from './plugin'

export const DOMAIN_GMAIL = 'gmail' as Domain

function TypeSharedMessage (): Type<SharedMessage> {
  return { _class: gmail.class.SharedMessage, label: gmail.string.SharedMessage }
}

@Model(gmail.class.Message, core.class.AttachedDoc, DOMAIN_GMAIL)
export class TMessage extends TAttachedDoc implements Message {
  declare attachedTo: Ref<Channel>
  declare attachedToClass: Ref<Class<Channel>>

  @Prop(TypeString(), gmail.string.MessageID)
    messageId!: string

  @Prop(TypeString(), gmail.string.ReplyTo)
  @Index(IndexKind.FullText)
    replyTo?: string

  @Prop(TypeString(), gmail.string.From)
  @Index(IndexKind.FullText)
    from!: string

  @Prop(TypeString(), gmail.string.To)
  @Index(IndexKind.FullText)
    to!: string

  @Prop(TypeString(), gmail.string.Subject)
  @Index(IndexKind.FullText)
    subject!: string

  @Prop(TypeString(), gmail.string.Message)
  @Index(IndexKind.FullText)
    content!: string

  @Prop(TypeString(), gmail.string.Message)
  @Index(IndexKind.FullText)
    textContent!: string

  @Prop(ArrOf(TypeString()), gmail.string.Copy)
    copy?: string[]

  @Prop(TypeBoolean(), gmail.string.Incoming)
    incoming!: boolean

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(TypeTimestamp(), core.string.Modified)
    sendOn!: Timestamp
}

@Model(gmail.class.NewMessage, core.class.Doc, DOMAIN_GMAIL)
@UX(gmail.string.NewMessage)
export class TNewMessage extends TDoc implements NewMessage {
  @Prop(TypeString(), gmail.string.ReplyTo)
  @Index(IndexKind.FullText)
    replyTo?: string

  @Prop(TypeString(), gmail.string.To)
  @Index(IndexKind.FullText)
    to!: string

  @Prop(TypeString(), gmail.string.Subject)
  @Index(IndexKind.FullText)
    subject!: string

  @Prop(TypeString(), gmail.string.Message)
  @Index(IndexKind.FullText)
    content!: string

  @Prop(TypeString(), gmail.string.Status)
    status!: 'new' | 'sent' | 'error'

  @Prop(TypeString(), gmail.string.Status)
    error?: string

  @Prop(ArrOf(TypeString()), gmail.string.Copy)
    copy?: string[]

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number
}

@Model(gmail.class.SharedMessages, core.class.AttachedDoc, DOMAIN_GMAIL)
export class TSharedMessages extends TAttachedDoc implements SharedMessages {
  @Prop(ArrOf(TypeSharedMessage()), gmail.string.Messages)
    messages!: SharedMessage[]
}

export function createModel (builder: Builder): void {
  builder.createModel(TMessage, TSharedMessages, TNewMessage)

  builder.createDoc(
    contact.class.ChannelProvider,
    core.space.Model,
    {
      label: gmail.string.Email,
      icon: contact.icon.Email,
      placeholder: gmail.string.EmailPlaceholder,
      presenter: gmail.component.Main,
      integrationType: gmail.integrationType.Gmail
    },
    contact.channelProvider.Email
  )

  builder.createDoc(
    setting.class.IntegrationType,
    core.space.Model,
    {
      label: gmail.string.IntegrationLabel,
      description: gmail.string.IntegrationDescription,
      icon: gmail.component.IconGmail,
      allowMultiple: false, // enable in future
      createComponent: gmail.component.Connect,
      onDisconnect: gmail.handler.DisconnectHandler,
      reconnectComponent: gmail.component.Connect,
      configureComponent: gmail.component.Configure
    },
    gmail.integrationType.Gmail
  )

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: gmail.class.Message,
      icon: contact.icon.Email,
      action: 'create',
      component: gmail.activity.GmailWriteMessage,
      label: gmail.string.HaveWrittenEmail
    },
    gmail.ids.GmailWriteMessageActivityViewlet
  )

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: gmail.class.SharedMessages,
      icon: contact.icon.Email,
      action: 'create',
      component: gmail.activity.GmailSharedMessage,
      label: gmail.string.SharedMessages,
      hideIfRemoved: true
    },
    gmail.ids.GmailSharedMessageActivityViewlet
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: gmail.component.NewMessages,
        element: 'float',
        fillProps: {
          _objects: 'value'
        }
      },
      label: gmail.string.WriteEmail,
      icon: contact.icon.Email,
      visibilityTester: gmail.function.HasEmail,
      input: 'any',
      category: contact.category.Contact,
      target: contact.class.Contact,
      context: {
        mode: ['context', 'browser']
      }
    },
    gmail.action.WriteEmail
  )

  builder.createDoc(core.class.FullTextSearchContext, core.space.Model, {
    toClass: gmail.class.Message
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_GMAIL,
    disabled: [
      { _class: 1 },
      { createdOn: -1 },
      { space: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { attachedToClass: 1 },
      { createdOn: -1 },
      { modifiedOn: 1 }
    ]
  })

  builder.mixin(gmail.class.Message, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: gmail.function.MessageTitleProvider
  })

  defineNotifications(builder)
}
