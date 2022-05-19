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
import { Builder, Index, Model, Prop, TypeRef, TypeString, TypeTimestamp, UX } from '@anticrm/model'
import core, { TAttachedDoc } from '@anticrm/model-core'
import view from '@anticrm/model-view'
import preference, { TPreference } from '@anticrm/model-preference'
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
}

export default attachment
