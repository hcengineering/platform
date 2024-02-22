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

import activity, { type ActivityMessage } from '@hcengineering/activity'
import {
  type Backlink,
  type Channel,
  chunterId,
  type ChunterMessage,
  type ChunterMessageExtension,
  type Comment,
  type DirectMessage,
  type Message,
  type DirectMessageInput,
  type ChatMessage,
  type ChatMessageViewlet,
  type ChunterSpace,
  type ObjectChatPanel,
  type ThreadMessage
} from '@hcengineering/chunter'
import contact, { type Person } from '@hcengineering/contact'
import {
  type Account,
  type Class,
  type Doc,
  type Domain,
  DOMAIN_MODEL,
  type Ref,
  type Space,
  type Timestamp,
  IndexKind
} from '@hcengineering/core'
import {
  ArrOf,
  type Builder,
  Collection as PropCollection,
  Collection,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeMarkup,
  TypeRef,
  TypeString,
  TypeTimestamp,
  UX
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import core, { TAttachedDoc, TClass, TDoc, TSpace } from '@hcengineering/model-core'
import notification from '@hcengineering/model-notification'
import view, { createAction, actionTemplates as viewTemplates } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import chunter from './plugin'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import { TypeBoolean } from '@hcengineering/model'
import type { IntlString, Resource } from '@hcengineering/platform'
import { TActivityMessage } from '@hcengineering/model-activity'

export { chunterId } from '@hcengineering/chunter'
export { chunterOperation } from './migration'

export const DOMAIN_CHUNTER = 'chunter' as Domain
export const DOMAIN_COMMENT = 'comment' as Domain

@Model(chunter.class.ChunterSpace, core.class.Space)
export class TChunterSpace extends TSpace implements ChunterSpace {
  @Prop(TypeTimestamp(), chunter.string.LastMessage)
    lastMessage?: Timestamp

  @Prop(ArrOf(TypeRef(chunter.class.ChunterMessage)), chunter.string.PinnedMessages)
    pinned?: Ref<ChunterMessage>[]
}

@Model(chunter.class.Channel, chunter.class.ChunterSpace)
@UX(chunter.string.Channel, chunter.icon.Hashtag)
export class TChannel extends TChunterSpace implements Channel {
  @Prop(TypeString(), chunter.string.Topic)
  @Index(IndexKind.FullText)
    topic?: string
}

@Model(chunter.class.DirectMessage, chunter.class.ChunterSpace)
@UX(chunter.string.DirectMessage, contact.icon.Person)
export class TDirectMessage extends TChunterSpace implements DirectMessage {}

@Model(chunter.class.ChunterMessage, core.class.AttachedDoc, DOMAIN_CHUNTER)
export class TChunterMessage extends TAttachedDoc implements ChunterMessage {
  @Prop(TypeMarkup(), chunter.string.Content)
  @Index(IndexKind.FullText)
    content!: string

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(TypeRef(core.class.Account), chunter.string.CreateBy)
  @ReadOnly()
    createBy!: Ref<Account>

  @Prop(TypeTimestamp(), chunter.string.Edit)
    editedOn?: Timestamp

  @Prop(Collection(activity.class.Reaction), activity.string.Reactions)
    reactions?: number
}

@Mixin(chunter.mixin.ChunterMessageExtension, chunter.class.ChunterMessage)
export class TChunterMessageExtension extends TChunterMessage implements ChunterMessageExtension {}

@Model(chunter.class.Message, chunter.class.ChunterMessage)
@UX(chunter.string.Message, undefined, 'MSG')
export class TMessage extends TChunterMessage implements Message {
  declare attachedTo: Ref<Space>

  declare attachedToClass: Ref<Class<Space>>

  @Prop(ArrOf(TypeRef(contact.class.Person)), chunter.string.Replies)
    replies?: Ref<Person>[]

  repliesCount?: number

  @Prop(TypeTimestamp(), activity.string.LastReply)
    lastReply?: Timestamp
}

@Model(chunter.class.Comment, core.class.AttachedDoc, DOMAIN_COMMENT)
@UX(chunter.string.Comment, undefined, 'COM')
export class TComment extends TAttachedDoc implements Comment {
  @Prop(TypeMarkup(), chunter.string.Message)
  @Index(IndexKind.FullText)
    message!: string

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(Collection(activity.class.Reaction), activity.string.Reactions)
    reactions?: number

  @Prop(TypeBoolean(), chunter.string.PinMessage)
    pinned?: boolean
}

@Model(chunter.class.Backlink, chunter.class.Comment)
@UX(chunter.string.Reference, chunter.icon.Chunter)
export class TBacklink extends TComment implements Backlink {
  backlinkId!: Ref<Doc>
  backlinkClass!: Ref<Class<Doc>>
}

@Mixin(chunter.mixin.DirectMessageInput, core.class.Class)
export class TDirectMessageInput extends TClass implements DirectMessageInput {
  component!: AnyComponent
}

@Model(chunter.class.ChatMessage, activity.class.ActivityMessage)
@UX(chunter.string.Message)
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
}

@Model(chunter.class.ThreadMessage, chunter.class.ChatMessage)
@UX(chunter.string.ThreadMessage)
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
  titleProvider!: Resource<(object: Doc) => string>
}

export function createModel (builder: Builder, options = { addApplication: true }): void {
  builder.createModel(
    TChunterSpace,
    TChannel,
    TMessage,
    TChunterMessage,
    TChunterMessageExtension,
    TComment,
    TBacklink,
    TDirectMessage,
    TDirectMessageInput,
    TChatMessage,
    TThreadMessage,
    TChatMessageViewlet,
    TObjectChatPanel
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

    builder.mixin(spaceClass, core.class.Class, workbench.mixin.SpaceView, {
      view: {
        class: chunter.class.Message
      }
    })

    builder.mixin(spaceClass, core.class.Class, view.mixin.ObjectEditor, {
      editor: chunter.component.EditChannel
    })

    builder.mixin(spaceClass, core.class.Class, view.mixin.ObjectPanel, {
      component: chunter.component.ChannelPanel
    })
  })

  builder.mixin(chunter.class.Message, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['createdBy', 'replies']
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: chunter.function.DirectTitleProvider
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: chunter.function.ChannelTitleProvider
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['members']
  })

  builder.mixin(chunter.class.Channel, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['members']
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: chunter.component.DmPresenter
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, notification.mixin.NotificationPreview, {
    presenter: chunter.component.ChannelPreview
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, chunter.mixin.DirectMessageInput, {
    component: chunter.component.DirectMessageInput
  })

  builder.mixin(chunter.class.Message, core.class.Class, notification.mixin.NotificationObjectPresenter, {
    presenter: chunter.component.ThreadParentPresenter
  })

  builder.mixin(chunter.class.Message, core.class.Class, view.mixin.ObjectPanel, {
    component: chunter.component.ThreadViewPanel
  })

  builder.mixin(chunter.class.Message, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: chunter.component.MessagePresenter
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: chunter.component.ChannelPresenter
  })

  builder.mixin(chunter.class.ChatMessage, core.class.Class, notification.mixin.NotificationContextPresenter, {
    labelPresenter: chunter.component.ChatMessageNotificationLabel
  })

  builder.createDoc(notification.class.ActivityNotificationViewlet, core.space.Model, {
    messageMatch: {
      _class: chunter.class.ThreadMessage
    },
    presenter: chunter.component.ThreadNotificationPresenter
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

  createAction(
    builder,
    {
      action: chunter.actionImpl.ArchiveChannel,
      label: chunter.string.ArchiveChannel,
      icon: view.icon.Archive,
      input: 'focus',
      category: chunter.category.Chunter,
      target: chunter.class.Channel,
      query: {
        archived: false
      },
      context: {
        mode: 'context',
        group: 'tools'
      }
    },
    chunter.action.ArchiveChannel
  )

  createAction(
    builder,
    {
      action: chunter.actionImpl.UnarchiveChannel,
      label: chunter.string.UnarchiveChannel,
      icon: view.icon.Archive,
      input: 'focus',
      category: chunter.category.Chunter,
      target: chunter.class.Channel,
      query: {
        archived: true
      },
      context: {
        mode: 'context',
        group: 'tools'
      }
    },
    chunter.action.UnarchiveChannel
  )

  createAction(
    builder,
    {
      action: chunter.actionImpl.ConvertDmToPrivateChannel,
      label: chunter.string.ConvertToPrivate,
      icon: chunter.icon.Lock,
      input: 'focus',
      category: chunter.category.Chunter,
      target: chunter.class.DirectMessage,
      context: {
        mode: 'context',
        group: 'edit'
      }
    },
    chunter.action.ConvertToPrivate
  )

  if (options.addApplication) {
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
  }

  builder.mixin(chunter.class.ThreadMessage, core.class.Class, view.mixin.LinkProvider, {
    encode: chunter.function.GetThreadLink
  })

  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: chunter.function.GetLink
      },
      label: chunter.string.CopyLink,
      icon: chunter.icon.Copy,
      keyBinding: [],
      input: 'none',
      category: chunter.category.Chunter,
      target: activity.class.ActivityMessage,
      visibilityTester: chunter.function.CanCopyMessageLink,
      context: {
        mode: ['context', 'browser'],
        application: chunter.app.Chunter,
        group: 'copy'
      }
    },
    chunter.action.CopyChatMessageLink
  )

  builder.createDoc(activity.class.ActivityMessagesFilter, core.space.Model, {
    label: chunter.string.FilterBacklinks,
    position: 60,
    filter: chunter.filter.BacklinksFilter
  })

  builder.mixin(chunter.class.ChunterMessage, core.class.Class, view.mixin.ClassFilters, {
    filters: ['space', '_class']
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.ClassFilters, {
    filters: []
  })

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: chunter.string.ApplicationLabelChunter,
      icon: chunter.icon.Chunter
    },
    chunter.ids.ChunterNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: chunter.string.MentionNotification,
      generated: false,
      hidden: false,
      txClasses: [core.class.TxCreateDoc],
      objectClass: chunter.class.Backlink,
      group: chunter.ids.ChunterNotificationGroup,
      providers: {
        [notification.providers.EmailNotification]: true,
        [notification.providers.PlatformNotification]: true
      },
      templates: {
        textTemplate: '{sender} mentioned you in {doc} {data}',
        htmlTemplate: '<p>{sender}</b> mentioned you in {doc}</p> {data}',
        subjectTemplate: 'You were mentioned in {doc}'
      }
    },
    chunter.ids.MentionNotification
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: chunter.string.DM,
      generated: false,
      hidden: false,
      txClasses: [core.class.TxCreateDoc],
      objectClass: chunter.class.ChatMessage,
      providers: {
        [notification.providers.EmailNotification]: false,
        [notification.providers.PlatformNotification]: true
      },
      group: chunter.ids.ChunterNotificationGroup,
      templates: {
        textTemplate: '{sender} has send you a message: {doc} {data}',
        htmlTemplate: '<p><b>{sender}</b> has send you a message {doc}</p> {data}',
        subjectTemplate: 'You have new direct message in {doc}'
      }
    },
    chunter.ids.DMNotification
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: chunter.string.Message,
      generated: false,
      hidden: false,
      txClasses: [core.class.TxCreateDoc],
      objectClass: chunter.class.ChatMessage,
      providers: {
        [notification.providers.PlatformNotification]: true
      },
      group: chunter.ids.ChunterNotificationGroup
    },
    chunter.ids.ChannelNotification
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: chunter.string.ThreadMessage,
      generated: false,
      hidden: false,
      txClasses: [core.class.TxCreateDoc],
      objectClass: chunter.class.ThreadMessage,
      providers: {
        [notification.providers.PlatformNotification]: true
      },
      group: chunter.ids.ChunterNotificationGroup
    },
    chunter.ids.ThreadNotification
  )

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: chunter.class.Backlink,
      action: 'create',
      component: chunter.component.BacklinkContent,
      labelComponent: chunter.activity.BacklinkCreatedLabel,
      hideIfRemoved: true
    },
    chunter.ids.BacklinkCreatedActivityViewlet
  )

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: chunter.class.Backlink,
      action: 'update',
      component: chunter.component.BacklinkContent,
      labelComponent: chunter.activity.BacklinkCreatedLabel,
      hideIfRemoved: true
    },
    chunter.ids.BacklinkUpdateActivityViewlet
  )

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: chunter.class.Backlink,
      action: 'remove',
      hideIfRemoved: true
    },
    chunter.ids.BacklinkRemovedActivityViewlet
  )

  createAction(builder, {
    ...viewTemplates.open,
    target: chunter.class.Channel,
    context: {
      mode: ['browser', 'context'],
      group: 'create'
    },
    action: workbench.actionImpl.Navigate,
    actionProps: {
      mode: 'space'
    }
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

  createAction(
    builder,
    {
      action: chunter.actionImpl.DeleteChatMessage,
      label: view.string.Delete,
      icon: view.icon.Delete,
      input: 'focus',
      keyBinding: ['Backspace'],
      category: chunter.category.Chunter,
      target: chunter.class.ChatMessage,
      visibilityTester: chunter.function.CanDeleteMessage,
      context: { mode: ['context', 'browser'], group: 'remove' }
    },
    chunter.action.DeleteChatMessage
  )

  createAction(
    builder,
    {
      ...viewTemplates.open,
      target: notification.class.DocNotifyContext,
      context: {
        mode: ['browser', 'context'],
        group: 'create'
      },
      action: chunter.actionImpl.OpenChannel
    },
    chunter.action.OpenChannel
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

  builder.createDoc(activity.class.ActivityMessageExtension, core.space.Model, {
    ofMessage: chunter.class.ChatMessage,
    components: [{ kind: 'footer', component: chunter.component.Replies }]
  })

  builder.createDoc(activity.class.ActivityMessageExtension, core.space.Model, {
    ofMessage: activity.class.DocUpdateMessage,
    components: [{ kind: 'footer', component: chunter.component.Replies }]
  })

  builder.createDoc(activity.class.ActivityMessageExtension, core.space.Model, {
    ofMessage: activity.class.ActivityInfoMessage,
    components: [{ kind: 'footer', component: chunter.component.Replies }]
  })

  builder.createDoc(activity.class.ActivityMessageExtension, core.space.Model, {
    ofMessage: chunter.class.ChatMessage,
    components: [{ kind: 'action', component: chunter.component.ReplyToThreadAction }]
  })

  builder.createDoc(activity.class.ActivityMessageExtension, core.space.Model, {
    ofMessage: activity.class.DocUpdateMessage,
    components: [{ kind: 'action', component: chunter.component.ReplyToThreadAction }]
  })

  builder.createDoc(activity.class.ActivityMessageExtension, core.space.Model, {
    ofMessage: activity.class.ActivityInfoMessage,
    components: [{ kind: 'action', component: chunter.component.ReplyToThreadAction }]
  })

  builder.mixin(chunter.class.Channel, core.class.Class, chunter.mixin.ObjectChatPanel, {
    ignoreKeys: ['archived', 'collaborators', 'lastMessage', 'pinned', 'topic', 'description']
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, chunter.mixin.ObjectChatPanel, {
    ignoreKeys: ['archived', 'collaborators', 'lastMessage', 'pinned', 'topic', 'description']
  })
}

export default chunter
