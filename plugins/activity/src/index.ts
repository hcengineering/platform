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

import type {
  AttachedDoc,
  Attribute,
  Class,
  Collection,
  Doc,
  DocumentQuery,
  Ref,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxUpdateDoc
} from '@hcengineering/core'
import type { Asset, IntlString, Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'

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

  // If defined, will be added to label displayed
  labelComponent?: AnyComponent

  // Filter
  match?: DocumentQuery<Tx>

  // Label will be displayed right after author
  label?: IntlString
  labelParams?: any
  // Do component need to be emphasized or not.
  display: 'inline' | 'content' | 'emphasized'

  // If defined and true, will show context menu with Edit action, and will pass 'edit:true' to viewlet properties.
  editable?: boolean

  // If defined and true, will hide all transactions from object in case it is deleted.
  hideOnRemove?: boolean
}

/**
 * Transaction being displayed.
 * @public
 */
export interface DisplayTx {
  // Source tx
  tx: TxCUD<Doc>

  // A set of collapsed transactions.
  txes: DisplayTx[]
  txDocIds?: Set<Ref<Doc>>

  // type check for createTx
  createTx?: TxCreateDoc<Doc>

  // Type check for updateTx
  updateTx?: TxUpdateDoc<Doc>

  // Type check for updateTx
  mixinTx?: TxMixin<Doc, Doc>

  // Document in case it is required.
  doc?: Doc
  // Previous document in case it is required.
  prevDoc?: Doc

  updated: boolean
  mixin: boolean
  removed: boolean
  isOwnTx: boolean

  collectionAttribute?: Attribute<Collection<AttachedDoc>>
  originTx: TxCUD<Doc>
}

/**
 * @public
 */
export interface ActivityFilter extends Doc {
  label: IntlString
  filter: Resource<(tx: DisplayTx, _class?: Ref<Doc>) => boolean>
}

/**
 * @public
 */
export interface ExtraActivityComponent extends Class<Doc> {
  component: AnyComponent
}

/**
 * @public
 */
export const activityId = 'activity' as Plugin

export default plugin(activityId, {
  icon: {
    Activity: '' as Asset
  },
  string: {
    Delete: '' as IntlString,
    Edit: '' as IntlString,
    Edited: '' as IntlString,
    Activity: '' as IntlString,
    Changed: '' as IntlString,
    To: '' as IntlString,
    Unset: '' as IntlString,
    Added: '' as IntlString,
    From: '' as IntlString,
    Removed: '' as IntlString
  },
  mixin: {
    ExtraActivityComponent: '' as Ref<Class<ExtraActivityComponent>>
  },
  class: {
    TxViewlet: '' as Ref<Class<TxViewlet>>,
    ActivityFilter: '' as Ref<Class<ActivityFilter>>
  },
  component: {
    Activity: '' as AnyComponent
  }
})
