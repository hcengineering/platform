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

import activity, { type ActivityMessage, type ActivityMessageControl } from '@hcengineering/activity'
import {
  type Channel,
  chunterId,
  type DirectMessage,
  type ChatMessage,
  type ChatMessageViewlet,
  type ChunterSpace,
  type ObjectChatPanel,
  type ThreadMessage,
  type ChatSyncInfo,
  type InlineButton,
  type TypingInfo,
  type InlineButtonAction
} from '@hcengineering/chunter'
import presentation from '@hcengineering/model-presentation'
import contact, { type ChannelProvider as SocialChannelProvider, type Person } from '@hcengineering/contact'
import {
  type Class,
  type Doc,
  type Domain,
  DOMAIN_MODEL,
  type Ref,
  type Timestamp,
  IndexKind,
  DOMAIN_TRANSIENT
} from '@hcengineering/core'
import {
  type Builder,
  Collection as PropCollection,
  Index,
  Mixin,
  Model,
  Prop,
  TypeMarkup,
  TypeRef,
  TypeString,
  TypeTimestamp,
  UX
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import core, { TAttachedDoc, TClass, TDoc, TSpace } from '@hcengineering/model-core'
import view from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { type IntlString, type Resource } from '@hcengineering/platform'
import { TActivityMessage } from '@hcengineering/model-activity'
import { type DocNotifyContext } from '@hcengineering/notification'

import chunter from './plugin'
import { defineActions } from './actions'
import { defineNotifications } from './notifications'

export { chunterId } from '@hcengineering/chunter'
export { chunterOperation } from './migration'

export const DOMAIN_CHUNTER = 'chunter' as Domain

@Model(chunter.class.ChunterSpace, core.class.Space)
export class TChunterSpace extends TSpace implements ChunterSpace {
  @Prop(PropCollection(activity.class.ActivityMessage), chunter.string.Messages)
    messages?: number
}

@Model(chunter.class.Channel, chunter.class.ChunterSpace)
@UX(chunter.string.Channel, chunter.icon.Hashtag, undefined, undefined, undefined, chunter.string.Channels)
export class TChannel extends TChunterSpace implements Channel {
  @Prop(TypeString(), chunter.string.Topic)
  @Index(IndexKind.FullText)
    topic?: string
}

@Model(chunter.class.DirectMessage, chunter.class.ChunterSpace)
@UX(chunter.string.DirectMessage, contact.icon.Person, undefined, undefined, undefined, chunter.string.DirectMessages)
export class TDirectMessage extends TChunterSpace implements DirectMessage {}

@Model(chunter.class.ChatMessage, activity.class.ActivityMessage)
@UX(chunter.string.Message, chunter.icon.Thread, undefined, undefined, undefined, chunter.string.Threads)
export class TChatMessage extends TActivityMessage implements ChatMessage {
  @Prop(TypeMarkup(), chunter.string.Message)
  @Index(IndexKind.FullText)
    message!: string

  @Prop(TypeTimestamp(), chunter.string.Edit)
    editedOn?: Timestamp

  @Prop(PropCollection(attachment.class.Attachment), attachment.string.Attachments, {
    shortLabel: attachment.string.Files
  })
    attachments?: number

  @Prop(TypeRef(contact.class.ChannelProvider), core.string.Object)
    provider?: Ref<SocialChannelProvider>

  @Prop(PropCollection(chunter.class.InlineButton), core.string.Object)
    inlineButtons?: number
}

@Model(chunter.class.ThreadMessage, chunter.class.ChatMessage)
@UX(chunter.string.ThreadMessage, chunter.icon.Thread, undefined, undefined, undefined, chunter.string.Threads)
export class TThreadMessage extends TChatMessage implements ThreadMessage {
  @Prop(TypeRef(activity.class.ActivityMessage), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  declare attachedTo: Ref<ActivityMessage>

  @Prop(TypeRef(activity.class.ActivityMessage), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  declare attachedToClass: Ref<Class<ActivityMessage>>

  @Prop(TypeRef(core.class.Doc), core.string.Object)
  @Index(IndexKind.Indexed)
    objectId!: Ref<Doc>

  @Prop(TypeRef(core.class.Class), core.string.Class)
  @Index(IndexKind.Indexed)
    objectClass!: Ref<Class<Doc>>
}

@Model(chunter.class.ChatMessageViewlet, core.class.Doc, DOMAIN_MODEL)
export class TChatMessageViewlet extends TDoc implements ChatMessageViewlet {
  @Prop(TypeRef(core.class.Doc), core.string.Class)
  @Index(IndexKind.Indexed)
    objectClass!: Ref<Class<Doc>>

  @Prop(TypeRef(core.class.Doc), core.string.Class)
  @Index(IndexKind.Indexed)
    messageClass!: Ref<Class<Doc>>

  label?: IntlString
  onlyWithParent?: boolean
}

@Mixin(chunter.mixin.ObjectChatPanel, core.class.Class)
export class TObjectChatPanel extends TClass implements ObjectChatPanel {
  ignoreKeys!: string[]
}

@Model(chunter.class.ChatSyncInfo, core.class.Doc, DOMAIN_CHUNTER)
export class TChatSyncInfo extends TDoc implements ChatSyncInfo {
  user!: Ref<Person>
  hidden!: Ref<DocNotifyContext>[]
  timestamp!: Timestamp
}

@Model(chunter.class.InlineButton, core.class.Doc, DOMAIN_CHUNTER)
export class TInlineButton extends TAttachedDoc implements InlineButton {
  name!: string
  titleIntl?: IntlString
  title?: string
  action!: Resource<InlineButtonAction>
}

@Model(chunter.class.TypingInfo, core.class.Doc, DOMAIN_TRANSIENT)
export class TTypingInfo extends TDoc implements TypingInfo {
  objectId!: Ref<Doc>
  objectClass!: Ref<Class<Doc>>
  person!: Ref<Person>
  lastTyping!: Timestamp
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TChunterSpace,
    TChannel,
    TDirectMessage,
    TChatMessage,
    TThreadMessage,
    TChatMessageViewlet,
    TObjectChatPanel,
    TChatSyncInfo,
    TInlineButton,
    TTypingInfo
  )
  const spaceClasses = [chunter.class.Channel, chunter.class.DirectMessage]

  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.ObjectIcon, {
    component: chunter.component.DirectIcon
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.ObjectIcon, {
    component: chunter.component.ChannelIcon
  })

  spaceClasses.forEach((spaceClass) => {
    builder.mixin(spaceClass, core.class.Class, activity.mixin.ActivityDoc, {})

    builder.mixin(spaceClass, core.class.Class, view.mixin.LinkProvider, {
      encode: chunter.function.GetChunterSpaceLinkFragment
    })

    builder.mixin(spaceClass, core.class.Class, view.mixin.ObjectEditor, {
      editor: chunter.component.EditChannel
    })

    builder.mixin(spaceClass, core.class.Class, view.mixin.ObjectPanel, {
      component: chunter.component.ChannelPanel
    })
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: chunter.function.DirectTitleProvider
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: chunter.function.ChannelTitleProvider
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: chunter.component.DmPresenter
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: chunter.component.ChannelPresenter
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.SpaceHeader, {
    header: chunter.component.DmHeader
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.SpaceHeader, {
    header: chunter.component.ChannelHeader
  })

  builder.createDoc(
    view.class.ActionCategory,
    core.space.Model,
    { label: chunter.string.Chat, visible: true },
    chunter.category.Chunter
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: chunter.class.Channel,
      descriptor: view.viewlet.Table,
      configOptions: {
        strict: true
      },
      config: ['', 'topic', 'private', 'archived', 'members'],
      props: { enableChecking: false }
    },
    chunter.viewlet.Channels
  )

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: chunter.string.ApplicationLabelChunter,
      icon: chunter.icon.Chunter,
      alias: chunterId,
      hidden: false,
      component: chunter.component.Chat,
      aside: chunter.component.ChatAside
    },
    chunter.app.Chunter
  )

  builder.mixin(activity.class.ActivityMessage, core.class.Class, view.mixin.LinkProvider, {
    encode: chunter.function.GetMessageLink
  })

  builder.mixin(chunter.class.ThreadMessage, core.class.Class, view.mixin.LinkProvider, {
    encode: chunter.function.GetThreadLink
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.ClassFilters, {
    filters: []
  })

  builder.createDoc(activity.class.ActivityMessagesFilter, core.space.Model, {
    label: chunter.string.Comments,
    position: 60,
    filter: chunter.filter.ChatMessagesFilter
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: chunter.function.DmIdentifierProvider
  })

  builder.mixin(chunter.class.ChatMessage, core.class.Class, view.mixin.CollectionPresenter, {
    presenter: chunter.component.ChatMessagesPresenter
  })

  builder.mixin(chunter.class.ChatMessage, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: chunter.component.ChatMessagePresenter
  })

  builder.mixin(chunter.class.ChatMessage, core.class.Class, presentation.mixin.InstantTransactions, {
    txClasses: [core.class.TxCreateDoc]
  })

  builder.mixin(chunter.class.ThreadMessage, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: chunter.component.ThreadMessagePresenter
  })

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      messageClass: chunter.class.ThreadMessage,
      objectClass: chunter.class.ChatMessage,
      label: chunter.string.RepliedToThread
    },
    chunter.ids.ThreadMessageViewlet
  )

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: chunter.class.Channel,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: chunter.class.DirectMessage,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: activity.class.DocUpdateMessage,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: chunter.class.ChatMessage,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: activity.class.ActivityReference,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.mixin(chunter.class.Channel, core.class.Class, chunter.mixin.ObjectChatPanel, {
    ignoreKeys: ['archived', 'collaborators', 'lastMessage', 'pinned', 'topic', 'description', 'members', 'owners']
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, chunter.mixin.ObjectChatPanel, {
    ignoreKeys: ['archived', 'collaborators', 'lastMessage', 'pinned', 'topic', 'description', 'members', 'owners']
  })

  builder.mixin(chunter.class.ChatMessage, core.class.Class, activity.mixin.ActivityMessagePreview, {
    presenter: chunter.component.ChatMessagePreview
  })

  builder.mixin(chunter.class.ThreadMessage, core.class.Class, activity.mixin.ActivityMessagePreview, {
    presenter: chunter.component.ThreadMessagePreview
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_CHUNTER,
    disabled: [{ _class: 1 }, { space: 1 }, { modifiedBy: 1 }, { createdBy: 1 }, { createdOn: -1 }]
  })

  builder.createDoc(activity.class.ReplyProvider, core.space.Model, {
    function: chunter.function.ReplyToThread
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.ClassFilters, {
    filters: ['name', 'topic', 'private', 'archived', 'members'],
    strict: true
  })

  builder.createDoc<ActivityMessageControl<ChunterSpace>>(activity.class.ActivityMessageControl, core.space.Model, {
    objectClass: chunter.class.Channel,
    skip: [
      { _class: core.class.TxMixin },
      { _class: core.class.TxCreateDoc, objectClass: { $ne: chunter.class.Channel } },
      { _class: core.class.TxRemoveDoc }
    ],
    allowedFields: ['members']
  })

  builder.createDoc<ActivityMessageControl<ChunterSpace>>(activity.class.ActivityMessageControl, core.space.Model, {
    objectClass: chunter.class.DirectMessage,
    skip: [{ _class: core.class.TxMixin }, { _class: core.class.TxCreateDoc }, { _class: core.class.TxRemoveDoc }],
    allowedFields: ['members']
  })

  builder.createDoc(activity.class.DocUpdateMessageViewlet, core.space.Model, {
    objectClass: chunter.class.Channel,
    action: 'create',
    component: chunter.activity.ChannelCreatedMessage
  })

  builder.createDoc(activity.class.DocUpdateMessageViewlet, core.space.Model, {
    objectClass: chunter.class.Channel,
    action: 'update',
    config: {
      members: {
        presenter: chunter.activity.MembersChangedMessage
      }
    }
  })

  builder.createDoc(activity.class.DocUpdateMessageViewlet, core.space.Model, {
    objectClass: chunter.class.DirectMessage,
    action: 'update',
    config: {
      members: {
        presenter: chunter.activity.MembersChangedMessage
      }
    }
  })

  defineActions(builder)
  defineNotifications(builder)
}

export default chunter
