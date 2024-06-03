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

import products, { type Product } from '@hcengineering/products'
import type { Class, Client, DocumentQuery, Ref, RelatedDocument, WithLookup } from '@hcengineering/core'
import { type Resources } from '@hcengineering/platform'
import { type ObjectSearchResult } from '@hcengineering/presentation'

import CreateProduct from './components/product/CreateProduct.svelte'
import EditProduct from './components/product/EditProduct.svelte'
import NewProductHeader from './components/product/NewProductHeader.svelte'
import ProductPresenter from './components/product/ProductPresenter.svelte'
import ProductSearchIcon from './components/product/ProductSearchIcon.svelte'
import ProductSearchItem from './components/product/ProductSearchItem.svelte'
import ChangeControlInlineEditor from './components/product-version/ChangeControlInlineEditor.svelte'
import CreateProductVersion from './components/product-version/CreateProductVersion.svelte'
import EditProductVersion from './components/product-version/EditProductVersion.svelte'
import ProductVersionPresenter from './components/product-version/ProductVersionPresenter.svelte'
import ProductVersionInlineEditor from './components/product-version/ProductVersionInlineEditor.svelte'
import ProductVersionsEditor from './components/product-version/ProductVersionsEditor.svelte'
import ProductVersionsPresenter from './components/product-version/ProductVersionsPresenter.svelte'
import ProductVersionStateEditor from './components/product-version/ProductVersionStateEditor.svelte'
import ProductVersionStatePresenter from './components/product-version/ProductVersionStatePresenter.svelte'
import ProductVersionVersionPresenter from './components/product-version/ProductVersionVersionPresenter.svelte'
import { canDeleteProductVersion, getVisibleFilters, productIdentifierProvider } from './utils'

const toObjectSearchResult = (e: WithLookup<Product>): ObjectSearchResult => ({
  doc: e,
  title: e.name,
  icon: products.icon.Product,
  component: ProductSearchItem
})

async function queryProduct (
  _class: Ref<Class<Product>>,
  client: Client,
  search: string,
  filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
): Promise<ObjectSearchResult[]> {
  const q: DocumentQuery<Product> = { name: { $like: `%${search}%` } }
  if (filter?.in !== undefined || filter?.nin !== undefined) {
    q._id = {}
    if (filter.in !== undefined) {
      q._id.$in = filter.in?.map((it) => it._id as Ref<Product>)
    }
    if (filter.nin !== undefined) {
      q._id.$nin = filter.nin?.map((it) => it._id as Ref<Product>)
    }
  }
  return (await client.findAll(_class, q, { limit: 200 })).map(toObjectSearchResult)
}

export default async (): Promise<Resources> => ({
  component: {
    CreateProduct,
    CreateProductVersion,
    EditProduct,
    EditProductVersion,
    NewProductHeader,
    ProductPresenter,
    ProductSearchIcon,
    ProductVersionPresenter,
    ProductVersionInlineEditor,
    ProductVersionsEditor,
    ProductVersionsPresenter,
    ProductVersionStateEditor,
    ProductVersionStatePresenter,
    ProductVersionVersionPresenter,
    ChangeControlInlineEditor
  },
  completion: {
    ProductQuery: async (client: Client, query: string, filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }) =>
      await queryProduct(products.class.Product, client, query, filter)
  },
  function: {
    GetVisibleFilters: getVisibleFilters,
    CanDeleteProductVersion: canDeleteProductVersion,
    ProductIdentifierProvider: productIdentifierProvider
  }
})
