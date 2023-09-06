//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import type { Contact } from '@hcengineering/contact'
import type { Attribute, Class, Doc, Ref, Timestamp } from '@hcengineering/core'
import { Mixin } from '@hcengineering/core'
import type { Asset, IntlString, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { DoneState, KanbanTemplateSpace, SpaceWithStates, State, Task } from '@hcengineering/task'

/**
 * @public
 */
export interface Funnel extends SpaceWithStates {
  fullDescription?: string
  attachments?: number
}

/**
 * @public
 */

export interface Customer extends Contact {
  leads?: number

  description: string
}

/**
 * @public
 */
export interface Lead extends Task {
  space: Ref<Funnel>
  attachedTo: Ref<Customer>
  status: Ref<State>
  startDate: Timestamp | null
  title: string
}

/**
 * @public
 */
export const leadId = 'lead' as Plugin

/**
 * @public
 */
const lead = plugin(leadId, {
  app: {
    Lead: '' as Ref<Doc>
  },
  class: {
    Lead: '' as Ref<Class<Lead>>,
    Funnel: '' as Ref<Class<Funnel>>
  },
  mixin: {
    Customer: '' as Ref<Mixin<Customer>>
  },
  string: {
    Lead: '' as IntlString,
    ConfigLabel: '' as IntlString
  },
  attribute: {
    State: '' as Ref<Attribute<State>>,
    DoneState: '' as Ref<Attribute<DoneState>>
  },
  icon: {
    Funnel: '' as Asset,
    Lead: '' as Asset,
    LeadApplication: '' as Asset,
    CreateCustomer: '' as Asset
  },
  space: {
    FunnelTemplates: '' as Ref<KanbanTemplateSpace>
  }
})

/**
 * @public
 */
export default lead
