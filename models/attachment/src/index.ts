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
import { Builder, Model, Prop, UX, TypeString, TypeTimestamp } from '@anticrm/model'
import type { Domain } from '@anticrm/core'
import core, { TAttachedDoc } from '@anticrm/model-core'
import type { Attachment, Photo } from '@anticrm/attachment'
import activity from '@anticrm/activity'

import view from '@anticrm/model-view'
import attachment from './plugin'

export { attachmentOperation } from './migration'

export const DOMAIN_ATTACHMENT = 'attachment' as Domain

@Model(attachment.class.Attachment, core.class.AttachedDoc, DOMAIN_ATTACHMENT)
@UX('File' as IntlString)
export class TAttachment extends TAttachedDoc implements Attachment {
  @Prop(TypeString(), 'Name' as IntlString)
  name!: string

  @Prop(TypeString(), 'File' as IntlString)
  file!: string

  @Prop(TypeString(), 'Size' as IntlString)
  size!: number

  @Prop(TypeString(), 'Type' as IntlString)
  type!: string

  @Prop(TypeTimestamp(), 'Date' as IntlString)
  lastModified!: number
}

@Model(attachment.class.Photo, attachment.class.Attachment)
@UX('Photo' as IntlString)
export class TPhoto extends TAttachment implements Photo {}

export function createModel (builder: Builder): void {
  builder.createModel(TAttachment, TPhoto)

  builder.mixin(attachment.class.Attachment, core.class.Class, view.mixin.AttributePresenter, {
    presenter: attachment.component.AttachmentPresenter
  })

  builder.mixin(attachment.class.Attachment, core.class.Class, view.mixin.AttributeEditor, {
    editor: attachment.component.Attachments
  })

  builder.mixin(attachment.class.Photo, core.class.Class, view.mixin.AttributeEditor, {
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
