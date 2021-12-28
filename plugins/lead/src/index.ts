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

import type { Contact } from '@anticrm/contact'
import type { Class, Ref } from '@anticrm/core'
import { Mixin } from '@anticrm/core'
import type { Asset, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import type { KanbanTemplateSpace, SpaceWithStates, Task } from '@anticrm/task'

/**
 * @public
 */
export interface Funnel extends SpaceWithStates {}

/**
 * @public
 *
 * @Mixin
 */

export interface Customer extends Contact {
  leads?: number

  description: string
}

/**
 * @public
 */
export interface Lead extends Task {
  attachedTo: Ref<Customer>

  title: string

  comments?: number
  attachments?: number
}

/**
 * @public
 */
export const leadId = 'lead' as Plugin

const lead = plugin(leadId, {
  class: {
    Lead: '' as Ref<Class<Lead>>,
    Funnel: '' as Ref<Class<Funnel>>
  },
  mixin: {
    Customer: '' as Ref<Mixin<Customer>>
  },
  icon: {
    Funnel: '' as Asset,
    Lead: '' as Asset,
    LeadApplication: '' as Asset
  },
  space: {
    FunnelTemplates: '' as Ref<KanbanTemplateSpace>
  }
})

export default lead
