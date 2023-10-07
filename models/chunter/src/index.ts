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

import activity from '@hcengineering/activity'
import {
  Backlink,
  Channel,
  chunterId,
  ChunterMessage,
  ChunterSpace,
  Comment,
  DirectMessage,
  Message,
  Reaction,
  SavedMessages,
  ThreadMessage,
  DirectMessageInput
} from '@hcengineering/chunter'
import contact, { Person } from '@hcengineering/contact'
import type { Account, Class, Doc, Domain, Ref, Space, Timestamp } from '@hcengineering/core'
import { IndexKind } from '@hcengineering/core'
import {
  ArrOf,
  Builder,
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
import core, { TAttachedDoc, TClass, TSpace } from '@hcengineering/model-core'
import notification from '@hcengineering/model-notification'
import preference, { TPreference } from '@hcengineering/model-preference'
import view, { createAction, actionTemplates as viewTemplates } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import chunter from './plugin'
import { AnyComponent } from '@hcengineering/ui'
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

  @Prop(Collection(chunter.class.Reaction), chunter.string.Reactions)
    reactions?: number
}

@Model(chunter.class.ThreadMessage, chunter.class.ChunterMessage)
@UX(chunter.string.ThreadMessage, undefined, 'TMSG')
export class TThreadMessage extends TChunterMessage implements ThreadMessage {
  declare attachedTo: Ref<Message>

  declare attachedToClass: Ref<Class<Message>>
}

@Model(chunter.class.Message, chunter.class.ChunterMessage)
@UX(chunter.string.Message, undefined, 'MSG')
export class TMessage extends TChunterMessage implements Message {
  declare attachedTo: Ref<Space>

  declare attachedToClass: Ref<Class<Space>>

  @Prop(ArrOf(TypeRef(contact.class.Person)), chunter.string.Replies)
    replies?: Ref<Person>[]

  repliesCount?: number

  @Prop(TypeTimestamp(), chunter.string.LastReply)
    lastReply?: Timestamp
}

@Model(chunter.class.Reaction, core.class.AttachedDoc, DOMAIN_CHUNTER)
export class TReaction extends TAttachedDoc implements Reaction {
  @Prop(TypeString(), chunter.string.Emoji)
    emoji!: string

  @Prop(TypeRef(core.class.Account), chunter.string.CreateBy)
    createBy!: Ref<Account>

  declare attachedTo: Ref<ChunterMessage>
  declare attachedToClass: Ref<Class<ChunterMessage>>
}

@Model(chunter.class.Comment, core.class.AttachedDoc, DOMAIN_COMMENT)
@UX(chunter.string.Comment, undefined, 'COM')
export class TComment extends TAttachedDoc implements Comment {
  @Prop(TypeMarkup(), chunter.string.Message)
  @Index(IndexKind.FullText)
    message!: string

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number
}

@Model(chunter.class.Backlink, chunter.class.Comment)
@UX(chunter.string.Reference, chunter.icon.Chunter)
export class TBacklink extends TComment implements Backlink {
  backlinkId!: Ref<Doc>
  backlinkClass!: Ref<Class<Doc>>
}

@Model(chunter.class.SavedMessages, preference.class.Preference)
export class TSavedMessages extends TPreference implements SavedMessages {
  @Prop(TypeRef(chunter.class.ChunterMessage), chunter.string.SavedMessages)
  declare attachedTo: Ref<ChunterMessage>
}

@Mixin(chunter.mixin.DirectMessageInput, core.class.Class)
export class TDirectMessageInput extends TClass implements DirectMessageInput {
  component!: AnyComponent
}

export function createModel (builder: Builder, options = { addApplication: true }): void {
  builder.createModel(
    TChunterSpace,
    TChannel,
    TMessage,
    TThreadMessage,
    TChunterMessage,
    TComment,
    TBacklink,
    TDirectMessage,
    TSavedMessages,
    TReaction,
    TDirectMessageInput
  )
  const spaceClasses = [chunter.class.Channel, chunter.class.DirectMessage]

  spaceClasses.forEach((spaceClass) => {
    builder.mixin(spaceClass, core.class.Class, workbench.mixin.SpaceView, {
      view: {
        class: chunter.class.Message
      }
    })

    builder.mixin(spaceClass, core.class.Class, view.mixin.ObjectEditor, {
      editor: chunter.component.EditChannel
    })

    builder.mixin(spaceClass, core.class.Class, view.mixin.ObjectPanel, {
      component: chunter.component.EditChannel
    })
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.SpaceName, {
    getName: chunter.function.GetDmName
  })

  builder.mixin(chunter.class.Message, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['createdBy', 'replies']
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['members']
  })

  builder.mixin(chunter.class.Channel, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['members']
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.ObjectPanel, {
    component: chunter.component.ChannelViewPanel
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.ObjectPanel, {
    component: chunter.component.ChannelViewPanel
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

  builder.mixin(chunter.class.ThreadMessage, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: chunter.component.MessagePresenter
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

  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.SpaceHeader, {
    header: chunter.component.DmHeader
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.SpaceHeader, {
    header: chunter.component.ChannelHeader
  })

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: chunter.string.Chat,
      icon: view.icon.Table,
      component: chunter.component.ChannelView
    },
    chunter.viewlet.Chat
  )

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: chunter.class.Message,
    descriptor: chunter.viewlet.Chat,
    config: []
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
      action: chunter.actionImpl.MarkUnread,
      label: chunter.string.MarkUnread,
      input: 'focus',
      category: chunter.category.Chunter,
      target: chunter.class.Message,
      context: {
        mode: 'context',
        group: 'edit'
      }
    },
    chunter.action.MarkUnread
  )

  createAction(
    builder,
    {
      label: chunter.string.MarkUnread,
      action: chunter.actionImpl.MarkCommentUnread,
      input: 'focus',
      category: chunter.category.Chunter,
      target: chunter.class.ThreadMessage,
      context: {
        mode: 'context',
        group: 'edit'
      }
    },
    chunter.action.MarkCommentUnread
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
        locationResolver: chunter.resolver.Location,
        alias: chunterId,
        hidden: false,
        navigatorModel: {
          specials: [
            {
              id: 'spaceBrowser',
              component: workbench.component.SpaceBrowser,
              icon: chunter.icon.ChannelBrowser,
              label: chunter.string.ChannelBrowser,
              position: 'top',
              spaceClass: chunter.class.Channel,
              componentProps: {
                _class: chunter.class.Channel,
                label: chunter.string.ChannelBrowser,
                createItemDialog: chunter.component.CreateChannel,
                createItemLabel: chunter.string.CreateChannel
              }
            },
            {
              id: 'archive',
              component: workbench.component.Archive,
              icon: view.icon.Archive,
              label: workbench.string.Archive,
              position: 'top',
              visibleIf: workbench.function.HasArchiveSpaces,
              spaceClass: chunter.class.Channel
            },
            {
              id: 'threads',
              label: chunter.string.Threads,
              icon: chunter.icon.Thread,
              component: chunter.component.Threads,
              position: 'top'
            },
            {
              id: 'savedItems',
              label: chunter.string.SavedItems,
              icon: chunter.icon.Bookmark,
              component: chunter.component.SavedMessages
            },
            {
              id: 'fileBrowser',
              label: attachment.string.FileBrowser,
              icon: attachment.icon.FileBrowser,
              component: attachment.component.FileBrowser,
              componentProps: {
                requestedSpaceClasses: [chunter.class.Channel, chunter.class.DirectMessage]
              }
            },
            {
              id: 'chunterBrowser',
              label: chunter.string.ChunterBrowser,
              icon: workbench.icon.Search,
              component: chunter.component.ChunterBrowser,
              visibleIf: chunter.function.ChunterBrowserVisible
            }
          ],
          spaces: [
            {
              id: 'channels',
              label: chunter.string.Channels,
              spaceClass: chunter.class.Channel,
              addSpaceLabel: chunter.string.CreateChannel,
              createComponent: chunter.component.CreateChannel
            },
            {
              id: 'directMessages',
              label: chunter.string.DirectMessages,
              spaceClass: chunter.class.DirectMessage,
              addSpaceLabel: chunter.string.NewDirectMessage,
              createComponent: chunter.component.CreateDirectMessage
            }
          ],
          aside: chunter.component.ThreadView
        }
      },
      chunter.app.Chunter
    )
  }

  builder.mixin(chunter.class.Comment, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: chunter.component.CommentPresenter
  })

  builder.mixin(chunter.class.Comment, core.class.Class, view.mixin.CollectionPresenter, {
    presenter: chunter.component.CommentsPresenter
  })

  builder.mixin(chunter.class.Comment, core.class.Class, view.mixin.ObjectPanel, {
    component: chunter.component.CommentPanel
  })

  builder.createDoc(
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: chunter.class.Comment,
      icon: chunter.icon.Chunter,
      txClass: core.class.TxCreateDoc,
      component: chunter.activity.TxCommentCreate,
      label: chunter.string.LeftComment,
      display: 'content',
      editable: true,
      hideOnRemove: true
    },
    chunter.ids.TxCommentCreate
  )

  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: chunter.function.GetLink
      },
      label: chunter.string.CopyLink,
      icon: chunter.icon.Thread,
      keyBinding: [],
      input: 'none',
      category: chunter.category.Chunter,
      target: chunter.class.Comment,
      context: {
        mode: ['context', 'browser'],
        group: 'copy'
      }
    },
    chunter.action.CopyCommentLink
  )

  builder.mixin(chunter.class.Comment, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Open]
  })

  builder.mixin(chunter.class.Message, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Open]
  })

  builder.mixin(chunter.class.ThreadMessage, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Open]
  })

  builder.mixin(chunter.class.Comment, core.class.Class, view.mixin.LinkProvider, {
    encode: chunter.function.GetFragment
  })

  builder.mixin(chunter.class.ThreadMessage, core.class.Class, view.mixin.LinkProvider, {
    encode: chunter.function.GetFragment
  })

  builder.mixin(chunter.class.Message, core.class.Class, view.mixin.LinkProvider, {
    encode: chunter.function.GetFragment
  })

  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: chunter.function.GetLink
      },
      label: chunter.string.CopyLink,
      icon: chunter.icon.Thread,
      keyBinding: [],
      input: 'none',
      category: chunter.category.Chunter,
      target: chunter.class.Message,
      context: {
        mode: ['context', 'browser'],
        application: chunter.app.Chunter,
        group: 'copy'
      }
    },
    chunter.action.CopyMessageLink
  )

  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: chunter.function.GetLink
      },
      label: chunter.string.CopyLink,
      icon: chunter.icon.Thread,
      keyBinding: [],
      input: 'none',
      category: chunter.category.Chunter,
      target: chunter.class.ThreadMessage,
      context: {
        mode: ['context', 'browser'],
        application: chunter.app.Chunter,
        group: 'copy'
      }
    },
    chunter.action.CopyThreadMessageLink
  )

  // We need to define this one, to hide default attached object removed case
  builder.createDoc(
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: chunter.class.Comment,
      icon: chunter.icon.Chunter,
      txClass: core.class.TxRemoveDoc,
      display: 'inline',
      hideOnRemove: true
    },
    chunter.ids.TxCommentRemove
  )

  builder.createDoc(
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: chunter.class.Message,
      icon: chunter.icon.Chunter,
      txClass: core.class.TxCreateDoc,
      component: chunter.activity.TxMessageCreate,
      label: chunter.string.DMNotification,
      display: 'content',
      editable: true,
      hideOnRemove: true
    },
    chunter.ids.TxMessageCreate
  )

  builder.createDoc(
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: chunter.class.Backlink,
      icon: chunter.icon.Chunter,
      txClass: core.class.TxCreateDoc,
      component: chunter.activity.TxBacklinkCreate,
      label: chunter.string.MentionedIn,
      labelComponent: chunter.activity.TxBacklinkReference,
      display: 'emphasized',
      editable: false,
      hideOnRemove: true
    },
    chunter.ids.TxBacklinkCreate
  )

  // We need to define this one, to hide default attached object removed case
  builder.createDoc(
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: chunter.class.Backlink,
      icon: chunter.icon.Chunter,
      txClass: core.class.TxRemoveDoc,
      display: 'inline',
      hideOnRemove: true
    },
    chunter.ids.TxBacklinkRemove
  )

  builder.createDoc(activity.class.ActivityFilter, core.space.Model, {
    label: chunter.string.FilterComments,
    filter: chunter.filter.CommentsFilter
  })

  builder.createDoc(activity.class.ActivityFilter, core.space.Model, {
    label: chunter.string.FilterBacklinks,
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
      objectClass: chunter.class.Message,
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
      objectClass: chunter.class.Message,
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
}

export default chunter
