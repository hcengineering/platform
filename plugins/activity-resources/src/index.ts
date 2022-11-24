//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { Resources, IntlString } from '@hcengineering/platform'
import { Class, Doc, Ref } from '@hcengineering/core'
import Activity from './components/Activity.svelte'
import TxView from './components/TxView.svelte'

export interface FilterItem {
  label: IntlString
  visible: boolean
}
export type FilterIndex = Ref<Class<Doc>> | 'All' | 'Status'
export type FilterOptions = Map<FilterIndex, FilterItem> | undefined

export { TxView }

export * from './activity'

export default async (): Promise<Resources> => ({
  component: {
    Activity
  }
})
