//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import inventory, { inventoryId } from '@hcengineering/inventory'
import { IntlString, mergeIds, StatusCode } from '@hcengineering/platform'

export default mergeIds(inventoryId, inventory, {
  status: {
    CategoryRequired: '' as StatusCode,
    NameRequired: '' as StatusCode
  },
  string: {
    Categories: '' as IntlString,
    Category: '' as IntlString,
    CategoryCreateLabel: '' as IntlString,
    CreateCategory: '' as IntlString,
    CreateSubcategory: '' as IntlString,
    Inventory: '' as IntlString,
    ProductCreateLabel: '' as IntlString,
    CreateProduct: '' as IntlString,
    Products: '' as IntlString,
    Product: '' as IntlString,
    SKU: '' as IntlString,
    Variant: '' as IntlString,
    Variants: '' as IntlString,
    NoVariantsForProduct: '' as IntlString,
    CreateVariant: '' as IntlString
  }
})
