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

import '@hcengineering/controlled-documents'
import { productsId } from '@hcengineering/products'
import products from '@hcengineering/products-resources/src/plugin'
import type { Client, Doc, Ref, Role } from '@hcengineering/core'
import { type Resource, mergeIds } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import type { Action } from '@hcengineering/view'

export default mergeIds(productsId, products, {
  action: {
    DeleteProductVersion: '' as Ref<Action<Doc, any>>
  },
  component: {
    CreateProduct: '' as AnyComponent,
    ProductPresenter: '' as AnyComponent,
    NewProductHeader: '' as AnyComponent,
    CreateProductVersion: '' as AnyComponent,
    ChangeControlInlineEditor: '' as AnyComponent,
    ProductVersionPresenter: '' as AnyComponent,
    ProductVersionInlineEditor: '' as AnyComponent,
    ProductVersionsEditor: '' as AnyComponent,
    ProductVersionsPresenter: '' as AnyComponent,
    ProductVersionStateEditor: '' as AnyComponent,
    ProductVersionStatePresenter: '' as AnyComponent,
    ProductVersionVersionPresenter: '' as AnyComponent
  },
  function: {
    CanDeleteProductVersion: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    ProductIdentifierProvider: '' as Resource<<T extends Doc>(client: Client, ref: Ref<T>, doc?: T) => Promise<string>>
  },
  role: {
    QARA: '' as Ref<Role>,
    Manager: '' as Ref<Role>,
    QualifiedUser: '' as Ref<Role>
  }
})
