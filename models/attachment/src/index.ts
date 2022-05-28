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
import type { Attachment, Photo, SavedAttachments } from '@anticrm/attachment'
import { Domain, IndexKind, Ref } from '@anticrm/core'
import { Builder, Index, Model, Prop, TypeBoolean, TypeRef, TypeString, TypeTimestamp, UX } from '@anticrm/model'
import core, { TAttachedDoc } from '@anticrm/model-core'
import preference, { TPreference } from '@anticrm/model-preference'
import view, { createAction } from '@anticrm/model-view'
import attachment from './plugin'

export { attachmentOperation } from './migration'

export const DOMAIN_ATTACHMENT = 'attachment' as Domain

@Model(attachment.class.Attachment, core.class.AttachedDoc, DOMAIN_ATTACHMENT)
@UX(attachment.string.File)
export class TAttachment extends TAttachedDoc implements Attachment {
  @Prop(TypeString(), attachment.string.Name)
  @Index(IndexKind.FullText)
  name!: string

  @Prop(TypeString(), attachment.string.File)
  file!: string

  @Prop(TypeString(), attachment.string.Size)
  size!: number

  @Prop(TypeString(), attachment.string.Type)
  @Index(IndexKind.FullText)
  type!: string

  @Prop(TypeTimestamp(), attachment.string.Date)
  lastModified!: number

  @Prop(TypeString(), attachment.string.Description)
  description!: string

  @Prop(TypeBoolean(), attachment.string.Pinned)
  pinned!: boolean
}

@Model(attachment.class.Photo, attachment.class.Attachment)
@UX(attachment.string.Photo)
export class TPhoto extends TAttachment implements Photo {}

@Model(attachment.class.SavedAttachments, preference.class.Preference)
export class TSavedAttachments extends TPreference implements SavedAttachments {
  @Prop(TypeRef(attachment.class.Attachment), attachment.string.SavedAttachments)
  attachedTo!: Ref<Attachment>
}

export function createModel (builder: Builder): void {
  builder.createModel(TAttachment, TPhoto, TSavedAttachments)

  builder.mixin(attachment.class.Attachment, core.class.Class, view.mixin.AttributePresenter, {
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
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: attachment.class.Attachment,
      icon: attachment.icon.Attachment,
      txClass: core.class.TxCreateDoc,
      component: attachment.activity.TxAttachmentCreate,
      label: attachment.string.AddAttachment,
      display: 'emphasized'
    },
    attachment.ids.TxAttachmentCreate
  )

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
      mode: ['context', 'browser']
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
    category: attachment.category.Attachments,
    target: attachment.class.Attachment,
    context: {
      mode: ['context', 'browser']
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
    category: attachment.category.Attachments,
    target: attachment.class.Attachment,
    context: {
      mode: ['context', 'browser']
    }
  })
}

export default attachment
