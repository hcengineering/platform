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

import type { Class, Doc, DocumentQuery, Ref, Tx } from '@anticrm/core'
import type { Asset, IntlString, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import type { AnyComponent } from '@anticrm/ui'

/**
 * Define an display for all transaction kinds for particular class.
 * @public
 */
export interface TxViewlet extends Doc {
  icon: Asset
  objectClass: Ref<Class<Doc>>
  txClass: Ref<Class<Tx>>
  // Component to display on.
  component?: AnyComponent
  // Filter
  match?: DocumentQuery<Tx>

  // Label will be displayed right after author
  label?: IntlString
  // Do component need to be emphasized or not.
  display: 'inline' | 'content' | 'emphasized'

  // If defined and true, will show context menu with Edit action, and will pass 'edit:true' to viewlet properties.
  editable?: boolean

  // If defined and true, will hide all transactions from object in case it is deleted.
  hideOnRemove?: boolean
}
/**
 * @public
 */
export const activityId = 'activity' as Plugin

export default plugin(activityId, {
  string: {
    Delete: '' as IntlString,
    Edit: '' as IntlString,
    Options: '' as IntlString,
    Edited: '' as IntlString,
    ShowMore: '' as IntlString,
    ShowLess: '' as IntlString
  },
  icon: {
    Activity: '' as Asset
  },
  class: {
    TxViewlet: '' as Ref<Class<TxViewlet>>
  },
  component: {
    Activity: '' as AnyComponent
  }
})
