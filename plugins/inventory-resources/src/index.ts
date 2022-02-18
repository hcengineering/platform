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

import { getMetadata, Resources } from '@anticrm/platform'
import Categories from './components/Categories.svelte'
import CreateCategory from './components/CreateCategory.svelte'
import CategoryPresenter from './components/CategoryPresenter.svelte'
import Products from './components/Products.svelte'
import ProductPresenter from './components/ProductPresenter.svelte'
import EditProduct from './components/EditProduct.svelte'
import Variants from './components/Variants.svelte'
import VariantPresenter from './components/VariantPresenter.svelte'
import { Doc } from '@anticrm/core'
import { showPopup } from '@anticrm/ui'
import { Product } from '@anticrm/inventory'
import login from '@anticrm/login'
import workbench from '@anticrm/workbench'
import view from '@anticrm/view'
import inventory from './plugin'

async function createSubcategory (object: Doc): Promise<void> {
  showPopup(CreateCategory, { attachedTo: object._id })
}

function productHTMLPresenter (doc: Doc): string {
  const product = doc as Product
  return `<a href="${getMetadata(login.metadata.FrontUrl)}/${workbench.component.WorkbenchApp}/${inventory.app.Inventory}/Products/#${view.component.EditDoc}|${product._id}|${product._class}">${product.name}</a>`
}

function productTextPresenter (doc: Doc): string {
  const product = doc as Product
  return `${product.name}`
}

export default async (): Promise<Resources> => ({
  actionImpl: {
    CreateSubcategory: createSubcategory
  },
  function: {
    ProductHTMLPresenter: productHTMLPresenter,
    ProductTextPresenter: productTextPresenter
  },
  component: {
    Categories,
    CategoryPresenter,
    Products,
    ProductPresenter,
    EditProduct,
    Variants,
    VariantPresenter
  }
})
