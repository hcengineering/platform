//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import type { Ref } from '@hcengineering/core'
import { inventoryId } from '@hcengineering/inventory'
import inventory from '@hcengineering/inventory-resources/src/plugin'
import { IntlString, mergeIds } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'
import { Action, ActionCategory, ViewAction, Viewlet } from '@hcengineering/view'

export default mergeIds(inventoryId, inventory, {
  action: {
    CreateSubcategory: '' as Ref<Action>
  },
  actionImpl: {
    CreateSubcategory: '' as ViewAction
  },
  category: {
    Inventory: '' as Ref<ActionCategory>
  },
  component: {
    Categories: '' as AnyComponent,
    CreateProduct: '' as AnyComponent,
    EditProduct: '' as AnyComponent,
    CategoryPresenter: '' as AnyComponent,
    CategoryRefPresenter: '' as AnyComponent,
    Variants: '' as AnyComponent,
    ProductPresenter: '' as AnyComponent,
    VariantPresenter: '' as AnyComponent
  },
  viewlet: {
    TableProduct: '' as Ref<Viewlet>
  },
  string: {
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString
  }
})
