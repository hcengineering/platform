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

import type { Class, Doc, Domain, Ref, Space } from '@hcengineering/core'
import type { Asset, IntlString, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'

/**
 * @public
 */
export interface Preference extends Doc {
  attachedTo: Ref<Doc>
}

/**
 * @public
 */
export interface SpacePreference extends Preference {
  attachedTo: Ref<Space>
}

/**
 * @public
 */
export const preferenceId = 'preference' as Plugin

/**
 * @public
 */
export const DOMAIN_PREFERENCE = 'preference' as Domain

/**
 * @public
 */
const preference = plugin(preferenceId, {
  class: {
    Preference: '' as Ref<Class<Preference>>,
    SpacePreference: '' as Ref<Class<SpacePreference>>
  },
  space: {
    Preference: '' as Ref<Space>
  },
  icon: {
    Star: '' as Asset
  },
  string: {
    DeleteStarred: '' as IntlString,
    Starred: '' as IntlString,
    Star: '' as IntlString,
    Unstar: '' as IntlString
  }
})

export default preference
