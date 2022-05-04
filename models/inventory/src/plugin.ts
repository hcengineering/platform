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

import type { Ref } from '@anticrm/core'
import { inventoryId } from '@anticrm/inventory'
import inventory from '@anticrm/inventory-resources/src/plugin'
import { mergeIds } from '@anticrm/platform'
import type { AnyComponent } from '@anticrm/ui'
import { Action, ActionCategory, ViewAction } from '@anticrm/view'

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
    Products: '' as AnyComponent,
    CreateProduct: '' as AnyComponent,
    EditProduct: '' as AnyComponent,
    CategoryPresenter: '' as AnyComponent,
    Variants: '' as AnyComponent,
    ProductPresenter: '' as AnyComponent,
    VariantPresenter: '' as AnyComponent
  }
})
