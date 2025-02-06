//
// Copyright © 2025 Hardcore Engineering Inc.
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
import core, { IndexKind } from '@hcengineering/core'
import { type Builder, Index, Model, Prop, TypeString, UX } from '@hcengineering/model'
import contact from '@hcengineering/model-contact'
import view from '@hcengineering/model-view'
import { TChunterSpace } from '@hcengineering/model-chunter'

import chunter from '@hcengineering/chunter'
import mail, { type MailThread } from '@hcengineering/mail'

export { mailId } from '@hcengineering/mail'
export { default } from './plugin'

@Model(mail.class.MailThread, chunter.class.ChunterSpace)
@UX(mail.string.MailThread, contact.icon.Person, undefined, undefined, undefined, mail.string.MailThread)
export class TMailThread extends TChunterSpace implements MailThread {
  @Prop(TypeString(), mail.string.Subject)
  @Index(IndexKind.FullText)
    subject!: string

  @Prop(TypeString(), mail.string.MailThreadId)
  @Index(IndexKind.Indexed)
    mailThreadId!: string

  @Prop(TypeString(), mail.string.From)
  @Index(IndexKind.FullText)
    from!: string

  @Prop(TypeString(), mail.string.To)
  @Index(IndexKind.FullText)
    to!: string
}

export function createModel (builder: Builder): void {
  builder.createModel(TMailThread)

  builder.mixin(mail.class.MailThread, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.mixin(mail.class.MailThread, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: mail.component.MailThreadPresenter
  })

  builder.mixin(mail.class.MailThread, core.class.Class, view.mixin.ObjectEditor, {
    editor: mail.component.MailThread
  })

  builder.mixin(mail.class.MailThread, core.class.Class, view.mixin.ObjectPanel, {
    component: mail.component.MailThread
  })
}
