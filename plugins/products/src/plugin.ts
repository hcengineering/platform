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

import { Mixin, Type, type Class, type Doc, type Ref } from '@hcengineering/core'
import type { Asset, IntlString, Plugin } from '@hcengineering/platform'

import { plugin } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import { ActionCategory, Viewlet } from '@hcengineering/view'
import type { DocumentSpaceType, DocumentSpaceTypeDescriptor } from '@hcengineering/controlled-documents'
import { Product, ProductVersion, ProductVersionState } from './types'

/** @public */
export const productsId = 'products' as Plugin

/** @public */
export const productsPlugin = plugin(productsId, {
  app: {
    Products: '' as Ref<Doc>
  },
  icon: {
    Product: '' as Asset,
    ProductVersion: '' as Asset,
    ProductsApplication: '' as Asset
  },
  class: {
    Product: '' as Ref<Class<Product>>,
    ProductVersion: '' as Ref<Class<ProductVersion>>,
    TypeProductVersionState: '' as Ref<Class<Type<ProductVersionState>>>
  },
  mixin: {
    ProductTypeData: '' as Ref<Mixin<Product>>
  },
  string: {
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString
  },
  category: {
    Products: '' as Ref<ActionCategory>
  },
  component: {
    ProductSearchIcon: '' as AnyComponent
  },
  ids: {
    NoParentVersion: '' as Ref<ProductVersion>
  },
  spaceType: {
    ProductType: '' as Ref<DocumentSpaceType>
  },
  spaceTypeDescriptor: {
    ProductType: '' as Ref<DocumentSpaceTypeDescriptor>
  },
  viewlet: {
    TableProduct: '' as Ref<Viewlet>,
    TableProductVersion: '' as Ref<Viewlet>
  }
})

/**
 * @public
 */
export default productsPlugin
