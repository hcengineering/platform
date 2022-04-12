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

import type { Class, Data, Doc, DocumentUpdate, Domain, Ref, Space } from '@anticrm/core'
import type { Asset, Plugin, Resource, IntlString } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'

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
export interface PreferenceClient {
  get: (_id: Ref<Doc>) => Preference | undefined
  update: <T extends Preference>(doc: T, operations: DocumentUpdate<T>) => Promise<void>
  set: <T extends Preference>(_class: Ref<Class<T>>, _id: Ref<Doc>, data: Omit<Data<T>, 'attachedTo'>) => Promise<void>
  unset: (_id: Ref<Doc>) => Promise<void>
}

/**
 * @public
 */
export type PreferenceClientFactoy = () => PreferenceClient

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
  },
  function: {
    GetPreferenceClient: '' as Resource<PreferenceClientFactoy>
  }
})

export default preference
