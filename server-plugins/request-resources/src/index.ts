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

import core, { Doc, Hierarchy, Tx, TxCollectionCUD, TxUpdateDoc } from '@hcengineering/core'
import request, { Request, RequestStatus } from '@hcengineering/request'
import type { TriggerControl } from '@hcengineering/server-core'

/**
 * @public
 */
export async function OnRequestUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const ptx = tx as TxCollectionCUD<Doc, Request>
  if (!checkTx(ptx, hierarchy)) return []
  const ctx = ptx.tx as TxUpdateDoc<Request>
  if (ctx.operations.$push?.approved === undefined) return []
  const request = (await control.findAll(ctx.objectClass, { _id: ctx.objectId }))[0]
  if (request.approved.length === request.requiredApprovesCount) {
    const collectionTx = control.txFactory.createTxUpdateDoc(ctx.objectClass, ctx.objectSpace, ctx.objectId, {
      status: RequestStatus.Completed
    })
    collectionTx.space = core.space.Tx
    const resTx = control.txFactory.createTxCollectionCUD(
      ptx.objectClass,
      ptx.objectId,
      ptx.objectSpace,
      'requests',
      collectionTx
    )
    resTx.space = core.space.Tx

    await control.apply([resTx, request.tx], true)
  }
  return []
}

function checkTx (ptx: TxCollectionCUD<Doc, Request>, hierarchy: Hierarchy): boolean {
  if (ptx._class !== core.class.TxCollectionCUD) {
    return false
  }

  if (ptx.tx._class !== core.class.TxUpdateDoc || !hierarchy.isDerived(ptx.tx.objectClass, request.class.Request)) {
    return false
  }
  return true
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnRequestUpdate
  }
})
