//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { IndexKind } from '@hcengineering/core'
import {
  type Builder,
  Index,
  Model,
  Prop,
  TypeString,
  UX
} from '@hcengineering/model'
import contact from '@hcengineering/model-contact'
import { TChunterSpace } from '@hcengineering/model-chunter'

import chunter from '@hcengineering/chunter'
import type { MailThread } from '@hcengineering/mail'

import mail from './plugin'

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
}

export function createModel (builder: Builder): void {
  builder.createModel(TMailThread)
}
