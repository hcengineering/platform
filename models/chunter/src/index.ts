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

import activity from '@anticrm/activity'
import type { Backlink, Channel, ChunterMessage, Comment, Message, ThreadMessage } from '@anticrm/chunter'
import contact, { Employee } from '@anticrm/contact'
import type { Account, Class, Doc, Domain, Ref, Space, Timestamp } from '@anticrm/core'
import { IndexKind } from '@anticrm/core'
import { ArrOf, Builder, Collection, Index, Model, Prop, TypeMarkup, TypeRef, TypeString, TypeTimestamp, UX } from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import core, { TAttachedDoc, TSpace } from '@anticrm/model-core'
import view from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import chunter from './plugin'
import notification from '@anticrm/model-notification'

export const DOMAIN_CHUNTER = 'chunter' as Domain
export const DOMAIN_COMMENT = 'comment' as Domain

@Model(chunter.class.Channel, core.class.Space)
@UX(chunter.string.Channel, chunter.icon.Hashtag)
export class TChannel extends TSpace implements Channel {
  @Prop(TypeTimestamp(), chunter.string.LastMessage)
  lastMessage?: Timestamp

  @Prop(ArrOf(TypeRef(chunter.class.ChunterMessage)), chunter.string.PinnedMessages)
  pinned?: Ref<ChunterMessage>[]

  @Prop(TypeString(), chunter.string.Topic)
  @Index(IndexKind.FullText)
  topic?: string
}

@Model(chunter.class.ChunterMessage, core.class.AttachedDoc, DOMAIN_CHUNTER)
export class TChunterMessage extends TAttachedDoc implements ChunterMessage {
  @Prop(TypeMarkup(), chunter.string.Content)
  @Index(IndexKind.FullText)
  content!: string

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments)
  attachments?: number

  @Prop(TypeRef(core.class.Account), chunter.string.CreateBy)
  createBy!: Ref<Account>

  @Prop(TypeTimestamp(), chunter.string.Create)
  createOn!: Timestamp

  @Prop(TypeTimestamp(), chunter.string.Edit)
  editedOn?: Timestamp
}

@Model(chunter.class.ThreadMessage, chunter.class.ChunterMessage)
export class TThreadMessage extends TChunterMessage implements ThreadMessage {
  declare attachedTo: Ref<Message>

  declare attachedToClass: Ref<Class<Message>>
}

@Model(chunter.class.Message, chunter.class.ChunterMessage)
export class TMessage extends TChunterMessage implements Message {
  declare attachedTo: Ref<Space>

  declare attachedToClass: Ref<Class<Space>>

  @Prop(ArrOf(TypeRef(contact.class.Employee)), chunter.string.Replies)
  replies?: Ref<Employee>[]

  @Prop(TypeTimestamp(), chunter.string.LastReply)
  lastReply?: Timestamp
}

@Model(chunter.class.Comment, core.class.AttachedDoc, DOMAIN_COMMENT)
@UX(chunter.string.Comment)
export class TComment extends TAttachedDoc implements Comment {
  @Prop(TypeMarkup(), chunter.string.Message)
  @Index(IndexKind.FullText)
  message!: string

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments)
  attachments?: number
}

@Model(chunter.class.Backlink, chunter.class.Comment)
@UX(chunter.string.Reference, chunter.icon.Chunter)
export class TBacklink extends TComment implements Backlink {
  backlinkId!: Ref<Doc>
  backlinkClass!: Ref<Class<Doc>>
}

export function createModel (builder: Builder): void {
  builder.createModel(TChannel, TMessage, TThreadMessage, TChunterMessage, TComment, TBacklink)
  builder.mixin(chunter.class.Channel, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: chunter.class.Message
    }
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.AttributePresenter, {
    presenter: chunter.component.ChannelPresenter
  })

  builder.mixin(chunter.class.Channel, core.class.Class, notification.mixin.SpaceLastEdit, {
    lastEditField: 'lastMessage'
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.ObjectEditor, {
    editor: chunter.component.EditChannel
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.SpaceHeader, {
    header: chunter.component.ChannelHeader
  })

  builder.createDoc(view.class.ViewletDescriptor, core.space.Model, {
    label: chunter.string.Chat,
    icon: view.icon.Table,
    component: chunter.component.ChannelView
  }, chunter.viewlet.Chat)

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: chunter.class.Message,
    descriptor: chunter.viewlet.Chat,
    config: {}
  })

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: chunter.string.MarkUnread,
      action: chunter.actionImpl.MarkUnread,
      singleInput: true
    },
    chunter.action.MarkUnread
  )

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: chunter.string.MarkUnread,
      action: chunter.actionImpl.MarkCommentUnread,
      singleInput: true
    },
    chunter.action.MarkCommentUnread
  )

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: chunter.class.Message,
    action: chunter.action.MarkUnread,
    context: {
      mode: 'context'
    }
  })

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: chunter.string.ArchiveChannel,
      icon: view.icon.Archive,
      action: chunter.actionImpl.ArchiveChannel
    },
    chunter.action.ArchiveChannel
  )

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: chunter.string.UnarchiveChannel,
      icon: view.icon.Archive,
      action: chunter.actionImpl.UnarchiveChannel
    },
    chunter.action.UnarchiveChannel
  )

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: chunter.class.Channel,
    action: chunter.action.ArchiveChannel,
    query: {
      archived: false
    },
    context: {
      mode: 'context'
    }
  })

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: chunter.class.Channel,
    action: chunter.action.UnarchiveChannel,
    query: {
      archived: true
    },
    context: {
      mode: 'context'
    }
  })

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: chunter.class.ThreadMessage,
    action: chunter.action.MarkCommentUnread,
    context: {
      mode: 'context'
    }
  })

  builder.createDoc(workbench.class.Application, core.space.Model, {
    label: chunter.string.ApplicationLabelChunter,
    icon: chunter.icon.Chunter,
    hidden: false,
    navigatorModel: {
      specials: [
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
        }
      ],
      spaces: [
        {
          label: chunter.string.Channels,
          spaceClass: chunter.class.Channel,
          addSpaceLabel: chunter.string.CreateChannel,
          createComponent: chunter.component.CreateChannel
        }
      ],
      aside: chunter.component.ThreadView
    }
  }, chunter.app.Chunter)

  builder.mixin(chunter.class.Comment, core.class.Class, view.mixin.AttributePresenter, {
    presenter: chunter.component.CommentPresenter
  })

  builder.createDoc(activity.class.TxViewlet, core.space.Model, {
    objectClass: chunter.class.Comment,
    icon: chunter.icon.Chunter,
    txClass: core.class.TxCreateDoc,
    component: chunter.activity.TxCommentCreate,
    label: chunter.string.LeftComment,
    display: 'content',
    editable: true,
    hideOnRemove: true
  }, chunter.ids.TxCommentCreate)

  // We need to define this one, to hide default attached object removed case
  builder.createDoc(activity.class.TxViewlet, core.space.Model, {
    objectClass: chunter.class.Comment,
    icon: chunter.icon.Chunter,
    txClass: core.class.TxRemoveDoc,
    display: 'inline',
    hideOnRemove: true
  }, chunter.ids.TxCommentRemove)

  builder.createDoc(activity.class.TxViewlet, core.space.Model, {
    objectClass: chunter.class.Backlink,
    icon: chunter.icon.Chunter,
    txClass: core.class.TxCreateDoc,
    component: chunter.activity.TxBacklinkCreate,
    label: chunter.string.MentionedIn,
    labelComponent: chunter.activity.TxBacklinkReference,
    display: 'emphasized',
    editable: false,
    hideOnRemove: true
  }, chunter.ids.TxCommentCreate)

  // We need to define this one, to hide default attached object removed case
  builder.createDoc(activity.class.TxViewlet, core.space.Model, {
    objectClass: chunter.class.Backlink,
    icon: chunter.icon.Chunter,
    txClass: core.class.TxRemoveDoc,
    display: 'inline',
    hideOnRemove: true
  }, chunter.ids.TxBacklinkRemove)
}

export { chunterOperation } from './migration'

export default chunter
