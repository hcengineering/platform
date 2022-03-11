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

import core, { AttachedDoc, Doc, Tx, TxCollectionCUD, TxCreateDoc, TxProcessor, TxUpdateDoc } from '@anticrm/core'
import inventory, { Product } from '@anticrm/inventory'
import login from '@anticrm/login'
import { getMetadata } from '@anticrm/platform'
import { TriggerControl } from '@anticrm/server-core'
import { getUpdateLastViewTx } from '@anticrm/server-notification'
import view from '@anticrm/view'
import workbench from '@anticrm/workbench'

const extractTx = (tx: Tx): Tx => {
  if (tx._class === core.class.TxCollectionCUD) {
    const ctx = (tx as TxCollectionCUD<Doc, AttachedDoc>)
    if (ctx.tx._class === core.class.TxCreateDoc) {
      const create = ctx.tx as TxCreateDoc<AttachedDoc>
      create.attributes.attachedTo = ctx.objectId
      create.attributes.attachedToClass = ctx.objectClass
      create.attributes.collection = ctx.collection
      return create
    }
    return ctx
  }

  return tx
}

/**
 * @public
 */
export async function OnProductCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = extractTx(tx)
  if (actualTx._class !== core.class.TxCreateDoc) {
    return []
  }

  const createTx = actualTx as TxCreateDoc<Product>

  if (!control.hierarchy.isDerived(createTx.objectClass, inventory.class.Product)) {
    return []
  }

  const doc = TxProcessor.createDoc2Doc(createTx)

  const lastViewTx = await getUpdateLastViewTx(control.findAll, doc._id, doc._class, createTx.modifiedOn, createTx.modifiedBy)

  return lastViewTx !== undefined ? [lastViewTx] : []
}

/**
 * @public
 */
export async function OnProductUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = extractTx(tx)
  if (actualTx._class !== core.class.TxUpdateDoc) {
    return []
  }

  const updateTx = actualTx as TxUpdateDoc<Product>

  if (!control.hierarchy.isDerived(updateTx.objectClass, inventory.class.Product)) {
    return []
  }

  const lastViewTx = await getUpdateLastViewTx(control.findAll, updateTx.objectId, updateTx.objectClass, updateTx.modifiedOn, updateTx.modifiedBy)

  return lastViewTx !== undefined ? [lastViewTx] : []
}

/**
 * @public
 */
export function productHTMLPresenter (doc: Doc): string {
  const product = doc as Product
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  return `<a href="${front}/${workbench.component.WorkbenchApp}/${inventory.app.Inventory}/Products/#${view.component.EditDoc}|${product._id}|${product._class}">${product.name}</a>`
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
  trigger: {
    OnProductCreate,
    OnProductUpdate
  },
  function: {
    ProductHTMLPresenter: productHTMLPresenter,
    ProductTextPresenter: productTextPresenter
  }
})
