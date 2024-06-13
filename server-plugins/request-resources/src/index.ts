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

import core, { Doc, Tx, TxCUD, TxCollectionCUD, TxCreateDoc, TxUpdateDoc, TxProcessor } from '@hcengineering/core'
import request, { Request, RequestStatus } from '@hcengineering/request'
import type { TriggerControl } from '@hcengineering/server-core'
import { pushDocUpdateMessages } from '@hcengineering/server-activity-resources'
import { DocUpdateMessage } from '@hcengineering/activity'
import notification from '@hcengineering/notification'
import { getNotificationTxes, getCollaborators } from '@hcengineering/server-notification-resources'

/**
 * @public
 */
export async function OnRequest (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  if (tx._class !== core.class.TxCollectionCUD) {
    return []
  }

  const hierarchy = control.hierarchy
  const ptx = tx as TxCollectionCUD<Doc, Request>

  if (!hierarchy.isDerived(ptx.tx.objectClass, request.class.Request)) {
    return []
  }

  let res: Tx[] = []

  res = res.concat(await getRequestNotificationTx(ptx, control))

  if (ptx.tx._class === core.class.TxUpdateDoc) {
    res = res.concat(await OnRequestUpdate(ptx, control))
  }

  return res
}

async function OnRequestUpdate (tx: TxCollectionCUD<Doc, Request>, control: TriggerControl): Promise<Tx[]> {
  const ctx = tx.tx as TxUpdateDoc<Request>
  const applyTxes: Tx[] = []

  if (ctx.operations.$push?.approved !== undefined) {
    const request = (await control.findAll(ctx.objectClass, { _id: ctx.objectId }))[0]

    if (request.approved.length === request.requiredApprovesCount) {
      const collectionTx = control.txFactory.createTxUpdateDoc(ctx.objectClass, ctx.objectSpace, ctx.objectId, {
        status: RequestStatus.Completed
      })
      collectionTx.space = core.space.Tx
      const resTx = control.txFactory.createTxCollectionCUD(
        tx.objectClass,
        tx.objectId,
        tx.objectSpace,
        'requests',
        collectionTx
      )
      resTx.space = core.space.Tx

      applyTxes.push(resTx)
      applyTxes.push(request.tx)
    }

    const approvedDateTx = control.txFactory.createTxCollectionCUD(
      tx.objectClass,
      tx.objectId,
      tx.objectSpace,
      'requests',
      control.txFactory.createTxUpdateDoc(ctx.objectClass, ctx.objectSpace, ctx.objectId, {
        $push: { approvedDates: Date.now() }
      })
    )
    applyTxes.push(approvedDateTx)
  }

  if (ctx.operations.status === RequestStatus.Rejected) {
    const request = (await control.findAll(ctx.objectClass, { _id: ctx.objectId }))[0]
    if (request.rejectedTx != null) {
      applyTxes.push(request.rejectedTx)
    }
  }

  if (applyTxes.length > 0) {
    await control.apply(applyTxes, true)
  }

  return []
}

async function getRequest (tx: TxCUD<Request>, control: TriggerControl): Promise<Request | undefined> {
  if (tx._class === core.class.TxCreateDoc) {
    return TxProcessor.createDoc2Doc(tx as TxCreateDoc<Request>)
  }
  if (tx._class === core.class.TxRemoveDoc) {
    return control.removedMap.get(tx.objectId) as Request
  }
  if (tx._class === core.class.TxUpdateDoc) {
    return (await control.findAll(tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]
  }

  return undefined
}

// We need request-specific logic to attach a activity message on request create/update to parent, but use request collaborators for notifications
async function getRequestNotificationTx (tx: TxCollectionCUD<Doc, Request>, control: TriggerControl): Promise<Tx[]> {
  const request = await getRequest(tx.tx, control)

  if (request === undefined) return []

  const doc = (await control.findAll(tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]

  if (doc === undefined) return []

  const res: Tx[] = []
  const messagesTxes = await pushDocUpdateMessages(control.ctx, control, [], doc, tx)

  if (messagesTxes.length === 0) return []

  res.push(...messagesTxes)

  const messages = messagesTxes.map((messageTx) =>
    TxProcessor.createDoc2Doc(messageTx.tx as TxCreateDoc<DocUpdateMessage>)
  )
  const collaborators = await getCollaborators(request, control, tx.tx, res)

  if (collaborators.length === 0) return res

  const notifyContexts = await control.findAll(notification.class.DocNotifyContext, {
    attachedTo: doc._id
  })

  for (const target of collaborators) {
    const txes = await getNotificationTxes(
      control,
      request,
      tx.tx,
      tx,
      target,
      { isOwn: true, isSpace: false, shouldUpdateTimestamp: true },
      notifyContexts,
      messages,
      new Map()
    )
    res.push(...txes)
  }

  return res
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnRequest
  }
})
