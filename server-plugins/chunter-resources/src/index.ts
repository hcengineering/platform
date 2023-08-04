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

import chunter, { Backlink, chunterId, ChunterSpace, Comment, Message, ThreadMessage } from '@hcengineering/chunter'
import contact, { Employee, PersonAccount } from '@hcengineering/contact'
import core, {
  Account,
  Class,
  concatLink,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  Ref,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import notification, { Collaborators, NotificationType } from '@hcengineering/notification'
import { getMetadata } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import { getDocCollaborators, getMixinTx } from '@hcengineering/server-notification-resources'
import { workbenchId } from '@hcengineering/workbench'

/**
 * @public
 */
export async function channelHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const channel = doc as ChunterSpace
  const front = getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.name}/${chunterId}/${channel._id}`
  const link = concatLink(front, path)
  return `<a href="${link}">${channel.name}</a>`
}

/**
 * @public
 */
export async function channelTextPresenter (doc: Doc): Promise<string> {
  const channel = doc as ChunterSpace
  return `${channel.name}`
}

/**
 * @public
 */
export async function CommentRemove (
  doc: Doc,
  hiearachy: Hierarchy,
  findAll: <T extends Doc>(
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
): Promise<Doc[]> {
  if (!hiearachy.isDerived(doc._class, chunter.class.Comment)) {
    return []
  }

  const comment = doc as Comment
  const result = await findAll(chunter.class.Backlink, {
    backlinkId: comment.attachedTo,
    backlinkClass: comment.attachedToClass,
    attachedDocId: comment._id
  })
  return result
}

async function ThreadMessageCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const actualTx = TxProcessor.extractTx(tx)
  if (actualTx._class !== core.class.TxCreateDoc) return []
  const doc = TxProcessor.createDoc2Doc(actualTx as TxCreateDoc<Doc>)
  if (!hierarchy.isDerived(doc._class, chunter.class.ThreadMessage)) {
    return []
  }

  const comment = doc as Comment
  if (!hierarchy.isDerived(comment.attachedToClass, chunter.class.Message)) {
    return []
  }

  const lastReplyTx = control.txFactory.createTxUpdateDoc<Message>(
    chunter.class.Message,
    comment.space,
    comment.attachedTo as Ref<Message>,
    {
      lastReply: tx.modifiedOn
    }
  )
  const employee = control.modelDb.getObject(tx.modifiedBy) as PersonAccount
  const employeeTx = control.txFactory.createTxUpdateDoc<Message>(
    chunter.class.Message,
    comment.space,
    comment.attachedTo as Ref<Message>,
    {
      $push: { replies: employee.person }
    }
  )
  const result: TxUpdateDoc<Message>[] = []
  result.push(lastReplyTx)
  result.push(employeeTx)
  return result
}

async function CommentCreate (tx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const actualTx = TxProcessor.extractTx(tx)
  if (actualTx._class !== core.class.TxCreateDoc) return []
  const doc = TxProcessor.createDoc2Doc(actualTx as TxCreateDoc<Comment>)
  if (
    !hierarchy.isDerived(doc._class, chunter.class.Comment) ||
    hierarchy.isDerived(doc._class, chunter.class.Backlink)
  ) {
    return []
  }
  const res: Tx[] = []
  const mixin = hierarchy.classHierarchyMixin(doc.attachedToClass, notification.mixin.ClassCollaborators)
  if (mixin !== undefined) {
    const targetDoc = (await control.findAll(doc.attachedToClass, { _id: doc.attachedTo }, { limit: 1 }))[0]
    if (targetDoc !== undefined) {
      if (hierarchy.hasMixin(targetDoc, notification.mixin.Collaborators)) {
        const collabMixin = hierarchy.as(targetDoc, notification.mixin.Collaborators) as Doc as Collaborators
        if (!collabMixin.collaborators.includes(doc.modifiedBy)) {
          res.push(
            control.txFactory.createTxMixin(
              targetDoc._id,
              targetDoc._class,
              targetDoc.space,
              notification.mixin.Collaborators,
              {
                $push: {
                  collaborators: doc.modifiedBy
                }
              }
            )
          )
        }
      } else {
        const collaborators = await getDocCollaborators(targetDoc, mixin, control)
        if (!collaborators.includes(doc.modifiedBy)) {
          collaborators.push(doc.modifiedBy)
        }
        res.push(getMixinTx(tx, control, collaborators))
      }
    }
  }
  return res
}

async function ThreadMessageDelete (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const rmTx = TxProcessor.extractTx(tx) as TxRemoveDoc<ThreadMessage>
  if (!hierarchy.isDerived(rmTx.objectClass, chunter.class.ThreadMessage)) {
    return []
  }

  const comment = control.removedMap.get(rmTx.objectId) as ThreadMessage
  if (comment === undefined) {
    return []
  }
  const comments = await control.findAll(chunter.class.ThreadMessage, {
    attachedTo: comment.attachedTo
  })
  const updateTx = control.txFactory.createTxUpdateDoc<Message>(
    chunter.class.Message,
    comment.space,
    comment.attachedTo,
    {
      replies: comments.map((comm) => (control.modelDb.getObject(comm.createBy) as PersonAccount).person),
      lastReply:
        comments.length > 0 ? Math.max(...comments.map((comm) => comm.createdOn ?? comm.modifiedOn)) : undefined
    }
  )

  return [updateTx]
}

/**
 * @public
 */
export async function ChunterTrigger (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const promises = [
    ThreadMessageCreate(tx, control),
    ThreadMessageDelete(tx, control),
    CommentCreate(tx as TxCUD<Doc>, control)
  ]
  const res = await Promise.all(promises)
  return res.flat()
}

/**
 * @public
 */
export async function IsDirectMessage (
  tx: Tx,
  doc: Doc,
  user: Ref<Account>,
  type: NotificationType,
  control: TriggerControl
): Promise<boolean> {
  const space = (await control.findAll(chunter.class.DirectMessage, { _id: doc.space }))[0]
  return space !== undefined
}

function isBacklink (ptx: TxCollectionCUD<Doc, Backlink>, hierarchy: Hierarchy): boolean {
  if (ptx._class !== core.class.TxCollectionCUD) {
    return false
  }

  if (
    ptx.tx._class !== core.class.TxCreateDoc ||
    !hierarchy.isDerived(ptx.tx.objectClass, chunter.class.Backlink) ||
    !hierarchy.isDerived(ptx.objectClass, contact.mixin.Employee)
  ) {
    return false
  }
  return true
}

/**
 * @public
 */
export async function IsMeMentioned (
  tx: Tx,
  doc: Doc,
  user: Ref<Account>,
  type: NotificationType,
  control: TriggerControl
): Promise<boolean> {
  const ptx = tx as TxCollectionCUD<Doc, Backlink>
  if (!isBacklink(ptx, control.hierarchy)) return false
  const backlink = TxProcessor.createDoc2Doc(ptx.tx as TxCreateDoc<Backlink>)
  if (!control.hierarchy.isDerived(backlink.backlinkClass, contact.mixin.Employee)) return false
  const acc = (
    await control.modelDb.findAll(contact.class.PersonAccount, { person: backlink.backlinkId as Ref<Employee> })
  )[0]
  return acc._id === user
}

/**
 * @public
 */
export async function IsChannelMessage (
  tx: Tx,
  doc: Doc,
  user: Ref<Account>,
  type: NotificationType,
  control: TriggerControl
): Promise<boolean> {
  const space = (await control.findAll(chunter.class.Channel, { _id: doc.space }))[0]
  return space !== undefined
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    ChunterTrigger
  },
  function: {
    CommentRemove,
    ChannelHTMLPresenter: channelHTMLPresenter,
    ChannelTextPresenter: channelTextPresenter,
    IsDirectMessage,
    IsMeMentioned,
    IsChannelMessage
  }
})
