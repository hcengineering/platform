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
import type { Attachment, Photo, SavedAttachments } from '@hcengineering/attachment'
import { Domain, IndexKind, Ref } from '@hcengineering/core'
import {
  Builder,
  Index,
  Model,
  Prop,
  TypeAttachment,
  TypeBoolean,
  TypeRef,
  TypeString,
  TypeTimestamp,
  UX
} from '@hcengineering/model'
import core, { TAttachedDoc } from '@hcengineering/model-core'
import preference, { TPreference } from '@hcengineering/model-preference'
import view, { createAction } from '@hcengineering/model-view'
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

  @Prop(TypeAttachment(), attachment.string.File)
    file!: string

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
}

@Model(attachment.class.Photo, attachment.class.Attachment)
@UX(attachment.string.Photo)
export class TPhoto extends TAttachment implements Photo {}

@Model(attachment.class.SavedAttachments, preference.class.Preference)
export class TSavedAttachments extends TPreference implements SavedAttachments {
  @Prop(TypeRef(attachment.class.Attachment), attachment.string.SavedAttachments)
  declare attachedTo: Ref<Attachment>
}

export function createModel (builder: Builder): void {
  builder.createModel(TAttachment, TPhoto, TSavedAttachments)

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
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: attachment.class.Attachment,
      icon: attachment.icon.Attachment,
      txClass: core.class.TxRemoveDoc,
      component: attachment.activity.TxAttachmentCreate,
      label: attachment.string.RemovedAttachment,
      display: 'inline'
    },
    attachment.ids.TxAttachmentRemove
  )

  builder.createDoc(activity.class.ActivityFilter, core.space.Model, {
    label: attachment.string.FilterAttachments,
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
}

export default attachment
