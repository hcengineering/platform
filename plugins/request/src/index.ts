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

import { type Person } from '@hcengineering/contact'
import type { AttachedDoc, Class, Doc, Mixin, Ref, Timestamp, Tx } from '@hcengineering/core'
import type { Asset, IntlString, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'
import { ChatMessage } from '@hcengineering/chunter'

/**
 * @public
 */
export interface Request extends AttachedDoc {
  requested: Ref<Person>[]
  approved: Ref<Person>[]
  approvedDates?: Timestamp[]
  requiredApprovesCount: number
  rejected?: Ref<Person>
  status: RequestStatus
  tx: Tx
  rejectedTx?: Tx
  comments?: number
}

/**
 * @public
 */
export interface RequestDecisionComment extends ChatMessage {}

/**
 * @public
 */
export enum RequestStatus {
  Active = 'Active',
  Completed = 'Completed',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled'
}

/**
 * @public
 */
export interface RequestPresenter extends Class<Doc> {
  presenter: AnyComponent
}

/**
 * @public
 */
export const requestId = 'request' as Plugin

/**
 * @public
 */
const request = plugin(requestId, {
  class: {
    Request: '' as Ref<Class<Request>>
  },
  mixin: {
    RequestDecisionComment: '' as Ref<Mixin<RequestDecisionComment>>,
    RequestPresenter: '' as Ref<Mixin<RequestPresenter>>
  },
  component: {
    RequestPresenter: '' as AnyComponent,
    RequestView: '' as AnyComponent
  },
  string: {
    Requests: '' as IntlString,
    Request: '' as IntlString
  },
  icon: {
    Requests: '' as Asset
  }
})

export default request
