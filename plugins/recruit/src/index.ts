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

import { plugin } from '@anticrm/platform'
import type { Plugin, Asset } from '@anticrm/platform'
import type { Space, SpaceWithStates, DocWithState, Ref, Bag, Class } from '@anticrm/core'
import type { Person } from '@anticrm/contact'
import type { Attachment } from '@anticrm/chunter'

/**
 * @public
 */
export interface Vacancy extends SpaceWithStates {}

/**
 * @public
 */
export interface Candidates extends Space {}

/**
 * @public
 */
export interface Candidate extends Person {
  title?: string
  attachments: Bag<Attachment>
  applications?: number
  onsite?: boolean
  remote?: boolean
}

/**
 * @public
 */
export interface Applicant extends DocWithState {
  candidate: Ref<Candidate>
  attachments: Bag<Attachment>
}

/**
 * @public
 */
export const recruitId = 'recruit' as Plugin

export default plugin(recruitId, {
  class: {
    Applicant: '' as Ref<Class<Applicant>>,
    Candidate: '' as Ref<Class<Candidate>>
  },
  icon: {
    RecruitApplication: '' as Asset,
    Vacancy: '' as Asset
  }
})
