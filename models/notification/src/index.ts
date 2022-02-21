//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import type { Account, Doc, Domain, Ref, Timestamp, TxCUD } from '@anticrm/core'
import { ArrOf, Builder, Model, Prop, TypeRef, TypeString, TypeTimestamp } from '@anticrm/model'
import core, { TAttachedDoc, TDoc } from '@anticrm/model-core'
import type { EmailNotification, LastView, Notification, NotificationStatus } from '@anticrm/notification'
import type { IntlString } from '@anticrm/platform'
import notificaton from './plugin'

export const DOMAIN_NOTIFICATION = 'notification' as Domain

@Model(notificaton.class.LastView, core.class.AttachedDoc, DOMAIN_NOTIFICATION)
export class TLastView extends TAttachedDoc implements LastView {
  @Prop(TypeTimestamp(), notificaton.string.LastView)
  lastView!: Timestamp

  @Prop(TypeRef(core.class.Account), 'Modified By' as IntlString)
  user!: Ref<Account>
}

@Model(notificaton.class.Notification, core.class.AttachedDoc, DOMAIN_NOTIFICATION)
export class TNotification extends TAttachedDoc implements Notification {
  @Prop(TypeRef(core.class.Tx), 'TX' as IntlString)
  tx!: Ref<TxCUD<Doc>>

  @Prop(TypeString(), 'Status' as IntlString)
  status!: NotificationStatus
}

@Model(notificaton.class.EmailNotification, core.class.Doc, DOMAIN_NOTIFICATION)
export class TEmaiNotification extends TDoc implements EmailNotification {
  @Prop(TypeString(), 'Sender' as IntlString)
  sender!: string

  @Prop(ArrOf(TypeString()), 'Receivers' as IntlString)
  receivers!: string[]

  @Prop(TypeString(), 'Subject' as IntlString)
  subject!: string

  @Prop(TypeString(), 'Text' as IntlString)
  text!: string

  @Prop(TypeString(), 'Html' as IntlString)
  html?: string

  @Prop(TypeString(), 'Status' as IntlString)
  status!: 'new' | 'sent'
}

export function createModel (builder: Builder): void {
  builder.createModel(TLastView, TNotification, TEmaiNotification)
}

export { notificationOperation } from './migration'
