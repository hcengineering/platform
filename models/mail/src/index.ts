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

import core, { ClassifierKind, type Domain, IndexKind } from '@hcengineering/core'
import { type Builder, Index, Model, Prop, TypeString } from '@hcengineering/model'
import { TDoc } from '@hcengineering/model-core'

import view, { type Viewlet } from '@hcengineering/model-view'
import card from '@hcengineering/card'
import { getEmbeddedLabel } from '@hcengineering/platform'
import setting from '@hcengineering/setting'

import { type MailRoute } from '@hcengineering/mail'
import mail from './plugin'

const DOMAIN_MAIL = 'mail' as Domain
const mailTag = 'Mail'

export { mailId } from '@hcengineering/mail'
export { default } from './plugin'

@Model(mail.class.MailRoute, core.class.Doc, DOMAIN_MAIL)
export class TMailRoute extends TDoc implements MailRoute {
  @Prop(TypeString(), mail.string.MailId)
  @Index(IndexKind.Indexed)
    mailId!: string

  @Prop(TypeString(), mail.string.MailThreadId)
  @Index(IndexKind.Indexed)
    threadId!: string
}

export function createModel (builder: Builder): void {
  builder.createModel(TMailRoute)

  createMailTag(builder)
  createMailViewlet(builder)
}

function createMailTag (builder: Builder): void {
  builder.createDoc(
    card.class.MasterTag,
    core.space.Model,
    {
      extends: card.class.Card,
      label: getEmbeddedLabel(mailTag),
      kind: ClassifierKind.CLASS,
      icon: card.icon.MasterTag
    },
    mail.class.MailThread
  )
  builder.mixin(mail.class.MailThread, core.class.Mixin, setting.mixin.Editable, {
    value: false
  })
  builder.mixin(mail.class.MailThread, core.class.Mixin, setting.mixin.UserMixin, {})
}

function createMailViewlet (builder: Builder): void {
  builder.createDoc<Viewlet>(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: mail.class.MailThread,
      descriptor: view.viewlet.Table,
      config: [
        { key: 'createdBy', displayProps: { fixed: 'left', key: 'app' } },
        '',
        { key: 'modifiedOn', displayProps: { key: 'modified', fixed: 'right' } }
      ],
      configOptions: {
        hiddenKeys: ['name'],
        sortable: true
      }
    },
    mail.viewlet.TableMail
  )
}
