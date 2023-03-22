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

import { concatLink, Doc } from '@hcengineering/core'
import { inventoryId, Product } from '@hcengineering/inventory'
import { getMetadata } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import view from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'

/**
 * @public
 */
export async function productHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const product = doc as Product
  const front = getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.name}/${inventoryId}/Products/#${view.component.EditDoc}|${product._id}|${product._class}|content`
  const link = concatLink(front, path)
  return `<a href="${link}">${product.name}</a>`
}

/**
 * @public
 */
export async function productTextPresenter (doc: Doc): Promise<string> {
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
