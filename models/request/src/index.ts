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

import activity from '@hcengineering/activity'
import type { Person } from '@hcengineering/contact'
import contact from '@hcengineering/contact'
import { type Timestamp, type Domain, type Ref, type Tx } from '@hcengineering/core'
import {
  ArrOf,
  type Builder,
  Collection,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import chunter, { TChatMessage } from '@hcengineering/model-chunter'
import core, { TAttachedDoc, TClass } from '@hcengineering/model-core'
import { generateClassNotificationTypes } from '@hcengineering/model-notification'
import view from '@hcengineering/model-view'
import notification from '@hcengineering/notification'
import {
  type Request,
  type RequestDecisionComment,
  type RequestPresenter,
  type RequestStatus
} from '@hcengineering/request'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import request from './plugin'

export { requestOperation } from './migration'
export { requestId } from '@hcengineering/request'
export { default } from './plugin'

export const DOMAIN_REQUEST = 'request' as Domain

@Model(request.class.Request, core.class.AttachedDoc, DOMAIN_REQUEST)
@UX(request.string.Request, request.icon.Requests)
export class TRequest extends TAttachedDoc implements Request {
  @Prop(ArrOf(TypeRef(contact.class.Person)), request.string.Requested)
  // @Index(IndexKind.Indexed)
    requested!: Ref<Person>[]

  @Prop(ArrOf(TypeRef(contact.class.Person)), request.string.Approved)
  @ReadOnly()
    approved!: Ref<Person>[]

  approvedDates?: Timestamp[]

  requiredApprovesCount!: number

  @Prop(TypeString(), request.string.Status)
  // @Index(IndexKind.Indexed)
    status!: RequestStatus

  tx!: Tx
  rejectedTx?: Tx

  @Prop(TypeRef(contact.class.Person), request.string.Rejected)
  @ReadOnly()
    rejected?: Ref<Person>

  @Prop(Collection(chunter.class.ChatMessage), chunter.string.Comments)
    comments?: number
}

@Mixin(request.mixin.RequestDecisionComment, chunter.class.ChatMessage)
export class TRequestDecisionComment extends TChatMessage implements RequestDecisionComment {}

@Mixin(request.mixin.RequestPresenter, core.class.Class)
export class TRequestPresenter extends TClass implements RequestPresenter {
  presenter!: AnyComponent
}

export function createModel (builder: Builder): void {
  builder.createModel(TRequest, TRequestDecisionComment, TRequestPresenter)

  builder.mixin(request.class.Request, core.class.Class, activity.mixin.IgnoreActivity, {})

  builder.mixin(request.class.Request, core.class.Class, view.mixin.ObjectEditor, {
    editor: request.component.EditRequest
  })

  builder.mixin(request.class.Request, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: request.component.RequestPresenter
  })

  builder.mixin(request.class.Request, core.class.Class, notification.mixin.NotificationObjectPresenter, {
    presenter: request.component.NotificationRequestView
  })

  builder.mixin(request.class.Request, core.class.Class, request.mixin.RequestPresenter, {
    presenter: request.component.RequestView
  })

  builder.mixin(request.class.Request, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['requested', 'createdBy']
  })

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: request.string.Requests,
      icon: request.icon.Requests,
      objectClass: request.class.Request
    },
    request.ids.RequestNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      objectClass: request.class.Request,
      txClasses: [core.class.TxCreateDoc, core.class.TxUpdateDoc],
      field: 'requested',
      generated: false,
      group: request.ids.RequestNotificationGroup,
      label: request.string.Request,
      allowedForAuthor: true,
      defaultEnabled: true,
      templates: {
        textTemplate: '{sender} sent you a {doc}',
        htmlTemplate: '<p><b>{sender}</b> sent you a {doc}</p>',
        subjectTemplate: '{doc}'
      }
    },
    request.ids.CreateRequestNotification
  )

  generateClassNotificationTypes(
    builder,
    request.class.Request,
    request.ids.RequestNotificationGroup,
    ['requested'],
    ['comments', 'approved', 'rejected', 'status']
  )

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_REQUEST,
    disabled: [
      { _class: 1 },
      { space: 1 },
      { modifiedBy: 1 },
      { modifiedOn: 1 },
      { createdBy: 1 },
      { createdOn: 1 },
      { attachedTo: 1 },
      { attachedToClass: 1 },
      { status: 1 },
      { requested: 1 }
    ]
  })
}
