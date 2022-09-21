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

import { AttachedDoc, Class, Doc, Ref, Space } from '@hcengineering/core'
import type { Asset, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'

/**
 * @public
 */
export interface Category extends AttachedDoc {
  name: string
}

/**
 * @public
 */
export interface Product extends AttachedDoc {
  attachments?: number
  photos?: number
  variants?: number
  name: string
}

/**
 * @public
 */
export interface Variant extends AttachedDoc {
  name: string
  sku: string
}

/**
 * @public
 */
export const inventoryId = 'inventory' as Plugin

/**
 * @public
 */
const inventory = plugin(inventoryId, {
  class: {
    Product: '' as Ref<Class<Product>>,
    Category: '' as Ref<Class<Category>>,
    Variant: '' as Ref<Class<Variant>>
  },
  icon: {
    InventoryApplication: '' as Asset,
    Products: '' as Asset,
    Categories: '' as Asset,
    Variant: '' as Asset
  },
  global: {
    // Global category root, if not attached to some other object.
    Category: '' as Ref<Category>
  },
  space: {
    Category: '' as Ref<Space>,
    Products: '' as Ref<Space>
  },
  app: {
    Inventory: '' as Ref<Doc>
  }
})

export default inventory
