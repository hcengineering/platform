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
import type {
  Attachment,
  AttachmentMetadata,
  Drawing,
  Embedding,
  Photo,
  SavedAttachments
} from '@hcengineering/attachment'
import { IndexKind, type Blob, type Class, type Doc, type Domain, type Ref } from '@hcengineering/core'
import {
  Hidden,
  Index,
  Model,
  Prop,
  TypeBlob,
  TypeBoolean,
  TypeRef,
  TypeString,
  TypeTimestamp,
  UX,
  type Builder
} from '@hcengineering/model'
import core, { TAttachedDoc, TDoc } from '@hcengineering/model-core'
import preference, { TPreference } from '@hcengineering/model-preference'
import view, { createAction } from '@hcengineering/model-view'
import workbench, { WidgetType } from '@hcengineering/workbench'
import { getEmbeddedLabel } from '@hcengineering/platform'
import presentation from '@hcengineering/model-presentation'

import attachment from './plugin'

export { attachmentId } from '@hcengineering/attachment'
export { attachmentOperation } from './migration'

export const DOMAIN_ATTACHMENT = 'attachment' as Domain

@Model(attachment.class.Attachment, core.class.AttachedDoc, DOMAIN_ATTACHMENT)
@UX(attachment.string.File)
export class TAttachment extends TAttachedDoc implements Attachment {
  @Prop(TypeString(), attachment.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeBlob(), attachment.string.File)
    file!: Ref<Blob>

  @Prop(TypeString(), attachment.string.Size)
    size!: number

  @Prop(TypeString(), attachment.string.Type)
    type!: string

  @Prop(TypeTimestamp(), attachment.string.LastModified)
    lastModified!: number

  @Prop(TypeString(), attachment.string.Description)
  @Index(IndexKind.FullText)
    description!: string

  @Prop(TypeBoolean(), attachment.string.Pinned)
    pinned!: boolean

  metadata?: AttachmentMetadata
}

@Model(attachment.class.Embedding, attachment.class.Attachment)
@UX(attachment.string.Embeddings)
export class TEmbedding extends TAttachment implements Embedding {}

@Model(attachment.class.Photo, attachment.class.Attachment)
@UX(attachment.string.Photo)
export class TPhoto extends TAttachment implements Photo {}

@Model(attachment.class.SavedAttachments, preference.class.Preference)
export class TSavedAttachments extends TPreference implements SavedAttachments {
  @Prop(TypeRef(attachment.class.Attachment), attachment.string.SavedAttachments)
  declare attachedTo: Ref<Attachment>
}

@Model(attachment.class.Drawing, core.class.Doc, DOMAIN_ATTACHMENT)
export class TDrawing extends TDoc implements Drawing {
  @Prop(TypeRef(core.class.Doc), getEmbeddedLabel('Parent'))
  @Index(IndexKind.Indexed)
  @Hidden()
    parent!: Ref<Doc>

  @Prop(TypeRef(core.class.Class), getEmbeddedLabel('Parent class'))
  @Index(IndexKind.Indexed)
  @Hidden()
    parentClass!: Ref<Class<Doc>>

  @Prop(TypeString(), getEmbeddedLabel('Content'))
    content?: string
}

export function createModel (builder: Builder): void {
  builder.createModel(TAttachment, TEmbedding, TDrawing, TPhoto, TSavedAttachments)

  builder.mixin(attachment.class.Attachment, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: attachment.component.AttachmentPresenter
  })

  builder.mixin(attachment.class.Attachment, core.class.Class, view.mixin.CollectionPresenter, {
    presenter: attachment.component.AttachmentsPresenter
  })

  builder.mixin(attachment.class.Attachment, core.class.Class, view.mixin.CollectionEditor, {
    editor: attachment.component.Attachments
  })

  builder.mixin(attachment.class.Photo, core.class.Class, view.mixin.CollectionEditor, {
    editor: attachment.component.Photos
  })

  builder.createDoc(
    workbench.class.Widget,
    core.space.Model,
    {
      label: attachment.string.Files,
      type: WidgetType.Flexible,
      icon: attachment.icon.Attachment,
      component: attachment.component.PreviewWidget,
      closeIfNoTabs: true
    },
    attachment.ids.PreviewWidget
  )

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: presentation.extension.FilePreviewPopupActions,
    component: attachment.component.PreviewPopupActions
  })

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: attachment.class.Attachment,
      action: 'create',
      icon: attachment.icon.Attachment,
      label: attachment.string.AddAttachment,
      component: attachment.activity.AttachmentsUpdatedMessage
    },
    attachment.ids.AttachmentCreatedActivityViewlet
  )

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: attachment.class.Attachment,
      action: 'remove',
      icon: attachment.icon.Attachment,
      label: attachment.string.RemovedAttachment,
      component: attachment.activity.AttachmentsUpdatedMessage
    },
    attachment.ids.AttachmentRemovedActivityViewlet
  )

  builder.createDoc(activity.class.ActivityMessagesFilter, core.space.Model, {
    label: attachment.string.FilterAttachments,
    position: 50,
    filter: attachment.filter.AttachmentsFilter
  })

  builder.createDoc(
    view.class.ActionCategory,
    core.space.Model,
    { label: attachment.string.Attachments, visible: true },
    attachment.category.Attachments
  )

  createAction(builder, {
    action: view.actionImpl.ShowEditor,
    actionProps: {
      attribute: 'description'
    },
    label: attachment.string.Description,
    icon: view.icon.Open,
    input: 'focus',
    category: attachment.category.Attachments,
    target: attachment.class.Attachment,
    context: {
      mode: ['context', 'browser'],
      group: 'edit'
    }
  })

  createAction(builder, {
    action: view.actionImpl.UpdateDocument,
    actionProps: {
      key: 'pinned',
      value: true
    },
    query: {
      pinned: { $in: [false, undefined, null] }
    },
    label: attachment.string.PinAttachment,
    input: 'focus',
    icon: view.icon.Pin,
    category: attachment.category.Attachments,
    target: attachment.class.Attachment,
    context: {
      mode: ['context', 'browser'],
      group: 'edit'
    }
  })

  createAction(builder, {
    action: view.actionImpl.UpdateDocument,
    actionProps: {
      key: 'pinned',
      value: false
    },
    query: {
      pinned: true
    },
    label: attachment.string.UnPinAttachment,
    input: 'focus',
    icon: view.icon.Pin,
    category: attachment.category.Attachments,
    target: attachment.class.Attachment,
    context: {
      mode: ['context', 'browser'],
      group: 'edit'
    }
  })
  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_ATTACHMENT,
    disabled: [
      { attachedToClass: 1 },
      { modifiedOn: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { createdOn: -1 },
      { state: 1 },
      { _class: 1 }
    ]
  })

  builder.mixin(attachment.class.Drawing, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: attachment.component.DrawingPresenter
  })
}

export default attachment
