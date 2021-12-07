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
import { Builder, Model, Prop, UX, TypeString, Index } from '@anticrm/model'
import type { Ref, Doc, Class, Domain } from '@anticrm/core'
import { IndexKind } from '@anticrm/core'
import core, { TSpace, TDoc, TAttachedDoc } from '@anticrm/model-core'
import type { Backlink, Channel, Message, Comment, Attachment } from '@anticrm/chunter'
import type { AnyComponent } from '@anticrm/ui'
import activity from '@anticrm/activity'
import { TAttachment as TOriginAttachment } from '@anticrm/model-attachment'
import attachment from '@anticrm/attachment'

import workbench from '@anticrm/model-workbench'

import view from '@anticrm/model-view'
import chunter from './plugin'

export const DOMAIN_CHUNTER = 'chunter' as Domain
export const DOMAIN_COMMENT = 'comment' as Domain

@Model(chunter.class.Channel, core.class.Space)
@UX(chunter.string.Channel, chunter.icon.Hashtag)
export class TChannel extends TSpace implements Channel {}

@Model(chunter.class.Message, core.class.Doc, DOMAIN_CHUNTER)
export class TMessage extends TDoc implements Message {
  @Prop(TypeString(), 'Content' as IntlString)
  @Index(IndexKind.FullText)
  content!: string
}

@Model(chunter.class.Comment, core.class.AttachedDoc, DOMAIN_COMMENT)
@UX('Comment' as IntlString)
export class TComment extends TAttachedDoc implements Comment {
  @Prop(TypeString(), 'Message' as IntlString)
  @Index(IndexKind.FullText)
  message!: string
}

@Model(chunter.class.Attachment, attachment.class.Attachment)
@UX('File' as IntlString)
export class TAttachment extends TOriginAttachment implements Attachment {
}

@Model(chunter.class.Backlink, chunter.class.Comment)
export class TBacklink extends TComment implements Backlink {
  backlinkId!: Ref<Doc>
  backlinkClass!: Ref<Class<Doc>>
}

export function createModel (builder: Builder): void {
  builder.createModel(TChannel, TMessage, TComment, TBacklink, TAttachment)
  builder.mixin(chunter.class.Channel, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: chunter.class.Message
    }
  })

  builder.createDoc(view.class.ViewletDescriptor, core.space.Model, {
    label: 'Chat' as IntlString,
    icon: view.icon.Table,
    component: chunter.component.ChannelView
  }, chunter.viewlet.Chat)

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: chunter.class.Message,
    descriptor: chunter.viewlet.Chat,
    open: 'X' as AnyComponent,
    config: {}
  })

  builder.createDoc(workbench.class.Application, core.space.Model, {
    label: chunter.string.ApplicationLabelChunter,
    icon: chunter.icon.Chunter,
    hidden: false,
    navigatorModel: {
      spaces: [
        {
          label: chunter.string.Channels,
          spaceClass: chunter.class.Channel,
          addSpaceLabel: chunter.string.CreateChannel,
          createComponent: chunter.component.CreateChannel
        }
      ]
    }
  })
  builder.createDoc(chunter.class.Channel, core.space.Model, {
    name: 'general',
    description: 'General Channel',
    private: false,
    members: []
  })
  builder.createDoc(chunter.class.Channel, core.space.Model, {
    name: 'random',
    description: 'Random Talks',
    private: false,
    members: []
  })

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
}

export default chunter
