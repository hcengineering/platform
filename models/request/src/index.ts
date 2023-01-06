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
import chunter from '@hcengineering/chunter'
import type { EmployeeAccount } from '@hcengineering/contact'
import contact from '@hcengineering/contact'
import { Doc, Domain, IndexKind, Ref, TxCUD } from '@hcengineering/core'
import { ArrOf, Builder, Collection, Index, Model, Prop, ReadOnly, TypeRef, TypeString, UX } from '@hcengineering/model'
import core, { TAttachedDoc } from '@hcengineering/model-core'
import { Request, RequestStatus } from '@hcengineering/request'
import request from './plugin'
import view from '@hcengineering/model-view'

export const DOMAIN_REQUEST = 'request' as Domain

@Model(request.class.Request, core.class.AttachedDoc, DOMAIN_REQUEST)
@UX(request.string.Request, request.icon.Requests)
export class TRequest extends TAttachedDoc implements Request {
  @Prop(ArrOf(TypeRef(contact.class.EmployeeAccount)), request.string.Requested)
  @Index(IndexKind.Indexed)
    requested!: Ref<EmployeeAccount>[]

  @Prop(ArrOf(TypeRef(contact.class.EmployeeAccount)), request.string.Approved)
  @ReadOnly()
    approved!: Ref<EmployeeAccount>[]

  requiredApprovesCount!: number

  @Prop(TypeString(), request.string.Status)
  @Index(IndexKind.Indexed)
    status!: RequestStatus

  tx!: TxCUD<Doc>

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments?: number
}

export function createModel (builder: Builder): void {
  builder.createModel(TRequest)

  builder.mixin(request.class.Request, core.class.Class, view.mixin.ObjectEditor, {
    editor: request.component.EditRequest
  })

  builder.mixin(request.class.Request, core.class.Class, view.mixin.AttributePresenter, {
    presenter: request.component.RequestPresenter
  })

  builder.createDoc(
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: request.class.Request,
      icon: request.icon.Requests,
      txClass: core.class.TxCreateDoc,
      component: request.activity.TxCreateRequest,
      label: request.string.CreatedRequest,
      labelComponent: request.activity.RequestLabel,
      display: 'emphasized'
    },
    request.ids.TxRequestCreate
  )
}

export { default } from './plugin'
