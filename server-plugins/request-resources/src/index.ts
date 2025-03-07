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

import { DocUpdateMessage } from '@hcengineering/activity'
import core, { Doc, Tx, TxCUD, TxCreateDoc, TxProcessor, TxUpdateDoc, type MeasureContext } from '@hcengineering/core'
import notification from '@hcengineering/notification'
import { getPrimarySocialIdsByAccounts } from '@hcengineering/server-contact'
import { getResource, translate } from '@hcengineering/platform'
import request, { Request, RequestStatus } from '@hcengineering/request'
import { pushDocUpdateMessages } from '@hcengineering/server-activity-resources'
import type { TriggerControl } from '@hcengineering/server-core'
import {
  getCollaborators,
  getNotificationProviderControl,
  getNotificationTxes,
  getTextPresenter,
  getUsersInfo,
  toReceiverInfo
} from '@hcengineering/server-notification-resources'

/**
 * @public
 */
export async function OnRequest (txes: TxCUD<Doc>[], control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const ltxes = txes.filter((it) => hierarchy.isDerived(it.objectClass, request.class.Request))

  let res: Tx[] = []

  for (const ptx of ltxes) {
    res = res.concat(await getRequestNotificationTx(control.ctx, ptx as TxCUD<Request>, control))

    if (ptx._class === core.class.TxUpdateDoc) {
      res = res.concat(await OnRequestUpdate(ptx as TxUpdateDoc<Request>, control))
    }
  }

  return res
}

async function OnRequestUpdate (ctx: TxUpdateDoc<Request>, control: TriggerControl): Promise<Tx[]> {
  const applyTxes: Tx[] = []

  if (ctx.operations.$push?.approved !== undefined) {
    const request = (await control.findAll(control.ctx, ctx.objectClass, { _id: ctx.objectId }))[0]

    if (request.approved.length === request.requiredApprovesCount) {
      const collectionTx = control.txFactory.createTxUpdateDoc(ctx.objectClass, ctx.objectSpace, ctx.objectId, {
        status: RequestStatus.Completed
      })
      collectionTx.space = core.space.Tx
      const resTx = control.txFactory.createTxCollectionCUD(
        ctx.attachedToClass ?? ctx.objectClass,
        ctx.attachedTo ?? ctx.objectId,
        ctx.objectSpace,
        'requests',
        collectionTx
      )
      resTx.space = core.space.Tx

      applyTxes.push(resTx)
      applyTxes.push(request.tx)
    }

    const approvedDateTx = control.txFactory.createTxCollectionCUD(
      ctx.attachedToClass ?? ctx.objectClass,
      ctx.attachedTo ?? ctx.objectId,
      ctx.objectSpace,
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
  tx: TxCUD<Request>,
  control: TriggerControl
): Promise<Tx[]> {
  if (tx.attachedToClass === undefined || tx.attachedTo === undefined) return []
  const request = await getRequest(tx, control)

  if (request === undefined) return []

  const doc = (await control.findAll(control.ctx, tx.attachedToClass, { _id: tx.attachedTo }, { limit: 1 }))[0]

  if (doc === undefined) return []

  const res: Tx[] = []
  const messagesTxes = await pushDocUpdateMessages(control.ctx, control, [], doc, tx)

  if (messagesTxes.length === 0) return []

  res.push(...messagesTxes)

  const messages = messagesTxes.map((messageTx) =>
    TxProcessor.createDoc2Doc(messageTx as TxCreateDoc<DocUpdateMessage>)
  )
  const collaborators = await getCollaborators(control.ctx, request, control, tx, res)

  if (collaborators.length === 0) return res

  const notifyContexts = await control.findAll(control.ctx, notification.class.DocNotifyContext, {
    objectId: doc._id
  })
  const collaboratorsPrimarySocialStringsByAccounts = await getPrimarySocialIdsByAccounts(
    control,
    Array.from(collaborators)
  )
  const usersInfo = await getUsersInfo(
    control.ctx,
    [...Object.values(collaboratorsPrimarySocialStringsByAccounts), tx.modifiedBy],
    control
  )
  const senderInfo = usersInfo.get(tx.modifiedBy) ?? {
    _id: tx.modifiedBy,
    socialStrings: []
  }

  const notificationControl = await getNotificationProviderControl(ctx, control)

  for (const target of collaborators) {
    const targetInfo = toReceiverInfo(
      control.hierarchy,
      usersInfo.get(collaboratorsPrimarySocialStringsByAccounts[target])
    )
    if (targetInfo === undefined) continue

    const txes = await getNotificationTxes(
      ctx,
      control,
      request,
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
