//
// Copyright © 2024 Hardcore Engineering Inc.
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

import products, { productsId } from '@hcengineering/products'
import { type Ref, type Space } from '@hcengineering/core'
import { type IntlString, type Resource, mergeIds } from '@hcengineering/platform'
import { type ObjectSearchCategory, type ObjectSearchFactory } from '@hcengineering/presentation'
import { type AnyComponent } from '@hcengineering/ui'
import { type KeyFilter } from '@hcengineering/view'

export default mergeIds(productsId, products, {
  component: {
    EditProduct: '' as AnyComponent,
    EditProductVersion: '' as AnyComponent
  },
  completion: {
    ProductQuery: '' as Resource<ObjectSearchFactory>,
    ProductQueryCategory: '' as Ref<ObjectSearchCategory>
  },
  function: {
    GetVisibleFilters: '' as Resource<(filters: KeyFilter[], space?: Ref<Space>) => Promise<KeyFilter[]>>
  },
  string: {
    Product: '' as IntlString,
    Products: '' as IntlString,
    ProductsApplication: '' as IntlString,
    ProductNamePlaceholder: '' as IntlString,
    ProductDescriptionPlaceholder: '' as IntlString,
    ProductVersion: '' as IntlString,
    ProductVersions: '' as IntlString,
    ProductVersionDescriptionPlaceholder: '' as IntlString,
    ProductVersionParent: '' as IntlString,
    ProductVersionState: '' as IntlString,
    SearchProduct: '' as IntlString,
    CreateProduct: '' as IntlString,
    CreateProductVersion: '' as IntlString,
    NoProductVersionParent: '' as IntlString,
    NoProductVersions: '' as IntlString,
    CreateDialogClose: '' as IntlString,
    CreateDialogCloseNote: '' as IntlString,
    Description: '' as IntlString,
    Icon: '' as IntlString,
    Color: '' as IntlString,
    Major: '' as IntlString,
    Minor: '' as IntlString,
    Codename: '' as IntlString,
    Private: '' as IntlString,
    Public: '' as IntlString,
    Members: '' as IntlString,
    RoleLabel: '' as IntlString,
    ProductVersionStateActive: '' as IntlString,
    ProductVersionStateReleased: '' as IntlString,
    ChangeControl: '' as IntlString,
    ChangeSeverity: '' as IntlString
  }
})
