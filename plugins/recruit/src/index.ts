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
import type { Space, Doc, Ref } from '@anticrm/core'
import type { Person } from '@anticrm/contact'

/**
 * @public
 */
export interface Vacancy extends Space {}

/**
 * @public
 */
export interface Candidates extends Space {}

/**
 * @public
 */
export interface Candidate extends Person {}

/**
 * @public
 */
export interface Applicant extends Doc {
  candidate: Ref<Candidate>
}

/**
 * @public
 */
export const recruitId = 'recruit' as Plugin

export default plugin(recruitId, {
  icon: {
    RecruitApplication: '' as Asset,
    Vacancy: '' as Asset
  }
})
