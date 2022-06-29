//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Doc } from '@anticrm/core'
import { inventoryId, Product } from '@anticrm/inventory'
import login from '@anticrm/login'
import { getMetadata } from '@anticrm/platform'
import view from '@anticrm/view'
import { workbenchId } from '@anticrm/workbench'

/**
 * @public
 */
export function productHTMLPresenter (doc: Doc): string {
  const product = doc as Product
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  return `<a href="${front}/${workbenchId}/${inventoryId}/Products/#${view.component.EditDoc}|${product._id}|${product._class}">${product.name}</a>`
}

/**
 * @public
 */
export function productTextPresenter (doc: Doc): string {
  const product = doc as Product
  return `${product.name}`
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    ProductHTMLPresenter: productHTMLPresenter,
    ProductTextPresenter: productTextPresenter
  }
})
