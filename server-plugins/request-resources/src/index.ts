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

import core, {
  Doc,
  Tx,
  TxCUD,
  TxCollectionCUD,
  TxCreateDoc,
  TxUpdateDoc,
  TxProcessor,
  Ref,
  type MeasureContext
} from '@hcengineering/core'
import request, { Request, RequestStatus } from '@hcengineering/request'
import { getResource, translate } from '@hcengineering/platform'
import type { TriggerControl } from '@hcengineering/server-core'
import { pushDocUpdateMessages } from '@hcengineering/server-activity-resources'
import { DocUpdateMessage } from '@hcengineering/activity'
import notification from '@hcengineering/notification'
import {
  getNotificationTxes,
  getCollaborators,
  getTextPresenter,
  getUsersInfo,
  toReceiverInfo,
  getNotificationProviderControl
} from '@hcengineering/server-notification-resources'
import { PersonAccount } from '@hcengineering/contact'

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

  res = res.concat(await getRequestNotificationTx(control.ctx, ptx, control))

  if (ptx.tx._class === core.class.TxUpdateDoc) {
    res = res.concat(await OnRequestUpdate(ptx, control))
  }

  return res
}

async function OnRequestUpdate (tx: TxCollectionCUD<Doc, Request>, control: TriggerControl): Promise<Tx[]> {
  const ctx = tx.tx as TxUpdateDoc<Request>
  const applyTxes: Tx[] = []

  if (ctx.operations.$push?.approved !== undefined) {
    const request = (await control.findAll(control.ctx, ctx.objectClass, { _id: ctx.objectId }))[0]

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
    const request = (await control.findAll(control.ctx, ctx.objectClass, { _id: ctx.objectId }))[0]
    if (request.rejectedTx != null) {
      applyTxes.push(request.rejectedTx)
    }
  }

  if (applyTxes.length > 0) {
    await control.apply(control.ctx, applyTxes)
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
    return (await control.findAll(control.ctx, tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]
  }

  return undefined
}

// We need request-specific logic to attach a activity message on request create/update to parent, but use request collaborators for notifications
async function getRequestNotificationTx (
  ctx: MeasureContext,
  tx: TxCollectionCUD<Doc, Request>,
  control: TriggerControl
): Promise<Tx[]> {
  const request = await getRequest(tx.tx, control)

  if (request === undefined) return []

  const doc = (await control.findAll(control.ctx, tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]

  if (doc === undefined) return []

  const res: Tx[] = []
  const messagesTxes = await pushDocUpdateMessages(control.ctx, control, [], doc, tx)

  if (messagesTxes.length === 0) return []

  res.push(...messagesTxes)

  const messages = messagesTxes.map((messageTx) =>
    TxProcessor.createDoc2Doc(messageTx.tx as TxCreateDoc<DocUpdateMessage>)
  )
  const collaborators = await getCollaborators(control.ctx, request, control, tx.tx, res)

  if (collaborators.length === 0) return res

  const notifyContexts = await control.findAll(control.ctx, notification.class.DocNotifyContext, {
    objectId: doc._id
  })
  const usersInfo = await getUsersInfo(control.ctx, [...collaborators, tx.modifiedBy] as Ref<PersonAccount>[], control)
  const senderInfo = usersInfo.get(tx.modifiedBy) ?? {
    _id: tx.modifiedBy
  }

  const notificationControl = await getNotificationProviderControl(ctx, control)

  for (const target of collaborators) {
    const targetInfo = toReceiverInfo(control.hierarchy, usersInfo.get(target))
    if (targetInfo === undefined) continue

    const txes = await getNotificationTxes(
      ctx,
      control,
      request,
      tx.tx,
      tx,
      targetInfo,
      senderInfo,
      { isOwn: true, isSpace: false, shouldUpdateTimestamp: true },
      notifyContexts,
      messages,
      notificationControl
    )
    res.push(...txes)
  }

  return res
}

/**
 * @public
 */
export async function requestTextPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const request = doc as Request
  let title = await translate(control.hierarchy.getClass(request._class).label, {})

  const attachedDocTextPresenter = getTextPresenter(request.attachedToClass, control.hierarchy)
  if (attachedDocTextPresenter !== undefined) {
    const getTitle = await getResource(attachedDocTextPresenter.presenter)
    const attachedDoc = (
      await control.findAll(control.ctx, request.attachedToClass, { _id: request.attachedTo }, { limit: 1 })
    )[0]

    if (attachedDoc !== undefined) {
      title = `${title} — ${await getTitle(attachedDoc, control)}`
    }
  }

  return title
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    RequestTextPresenter: requestTextPresenter
  },
  trigger: {
    OnRequest
  }
})
