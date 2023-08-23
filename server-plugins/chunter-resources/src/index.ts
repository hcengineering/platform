//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
  AttachedDoc,
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
  TxFactory,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import notification, { Collaborators, NotificationType } from '@hcengineering/notification'
import { getMetadata } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import { getDocCollaborators, getMixinTx, pushNotification } from '@hcengineering/server-notification-resources'
import { workbenchId } from '@hcengineering/workbench'
import { getBacklinks } from './backlinks'
import { getMarkupAttributes } from './utils'

function getCreateBacklinksTxes (hierarchy: Hierarchy, txFactory: TxFactory, doc: Doc): Tx[] {
  const txes: Tx[] = []

  const backlinkId = (doc as AttachedDoc)?.attachedTo ?? doc._id
  const backlinkClass = (doc as AttachedDoc)?.attachedToClass ?? doc._class
  const attachedDocId = doc._id

  const attributes = getMarkupAttributes(hierarchy, doc._class)
  for (const attr of attributes) {
    const content = (doc as any)[attr.name]?.toString() ?? ''
    const backlinks = getBacklinks(backlinkId, backlinkClass, attachedDocId, content)

    for (const backlink of backlinks) {
      const innerTx = txFactory.createTxCreateDoc(chunter.class.Backlink, chunter.space.Backlinks, backlink)

      const collectionTx = txFactory.createTxCollectionCUD(
        backlink.attachedToClass,
        backlink.attachedTo,
        chunter.space.Backlinks,
        backlink.collection,
        innerTx
      )

      txes.push(collectionTx)
    }
  }

  return txes
}

async function getUpdateBacklinksTxes (control: TriggerControl, txFactory: TxFactory, doc: Doc): Promise<Tx[]> {
  const txes: Tx[] = []

  const backlinkId = (doc as AttachedDoc)?.attachedTo ?? doc._id
  const backlinkClass = (doc as AttachedDoc)?.attachedToClass ?? doc._class
  const attachedDocId = doc._id

  const attributes = getMarkupAttributes(control.hierarchy, doc._class)
  for (const attr of attributes) {
    const content = (doc as any)[attr.name]?.toString() ?? ''
    const backlinks = getBacklinks(backlinkId, backlinkClass, attachedDocId, content)

    const current = await control.findAll(chunter.class.Backlink, {
      backlinkId,
      backlinkClass,
      attachedDocId,
      collection: 'backlinks'
    })

    for (const c of current) {
      // Find existing and check if we need to update message
      const pos = backlinks.findIndex(
        (b) => b.backlinkId === c.backlinkId && b.backlinkClass === c.backlinkClass && b.attachedTo === c.attachedTo
      )
      if (pos !== -1) {
        // Update existing backlinks when message changed
        const data = backlinks[pos]
        if (c.message !== data.message) {
          const innerTx = txFactory.createTxUpdateDoc(c._class, c.space, c._id, {
            message: data.message
          })
          txes.push(
            txFactory.createTxCollectionCUD(
              c.attachedToClass,
              c.attachedTo,
              chunter.space.Backlinks,
              c.collection,
              innerTx
            )
          )
        }
        backlinks.splice(pos, 1)
      } else {
        // Remove not found backlinks
        const innerTx = txFactory.createTxRemoveDoc(c._class, c.space, c._id)
        txes.push(
          txFactory.createTxCollectionCUD(
            c.attachedToClass,
            c.attachedTo,
            chunter.space.Backlinks,
            c.collection,
            innerTx
          )
        )
      }
    }

    // Add missing backlinks
    for (const backlink of backlinks) {
      const backlinkTx = txFactory.createTxCreateDoc(chunter.class.Backlink, chunter.space.Backlinks, backlink)
      txes.push(
        txFactory.createTxCollectionCUD(
          backlink.attachedToClass,
          backlink.attachedTo,
          chunter.space.Backlinks,
          backlink.collection,
          backlinkTx
        )
      )
    }
  }

  return txes
}

async function getRemoveBacklinksTxes (control: TriggerControl, txFactory: TxFactory, doc: Ref<Doc>): Promise<Tx[]> {
  const txes: Tx[] = []

  const backlinks = await control.findAll(chunter.class.Backlink, { attachedDocId: doc, collection: 'backlinks' })
  for (const b of backlinks) {
    const innerTx = txFactory.createTxRemoveDoc(b._class, b.space, b._id)
    txes.push(
      txFactory.createTxCollectionCUD(b.attachedToClass, b.attachedTo, chunter.space.Backlinks, b.collection, innerTx)
    )
  }

  return txes
}

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

async function BacklinksCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const ctx = TxProcessor.extractTx(tx) as TxCreateDoc<Doc>
  if (ctx._class !== core.class.TxCreateDoc) return []
  if (hierarchy.isDerived(ctx.objectClass, chunter.class.Backlink)) return []

  const txFactory = new TxFactory(control.txFactory.account)
  const doc = TxProcessor.createDoc2Doc(ctx)

  const txes: Tx[] = getCreateBacklinksTxes(hierarchy, txFactory, doc)
  if (txes.length !== 0) {
    await control.apply(txes, true)
  }

  return []
}

async function BacklinksUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const ctx = TxProcessor.extractTx(tx) as TxUpdateDoc<Doc>
  if (ctx._class !== core.class.TxUpdateDoc) return []
  if (hierarchy.isDerived(ctx.objectClass, chunter.class.Backlink)) return []

  const rawDoc = (await control.findAll(ctx.objectClass, { _id: ctx.objectId }))[0]
  if (rawDoc === undefined) return []

  const txFactory = new TxFactory(control.txFactory.account)

  if (rawDoc !== undefined) {
    const doc = TxProcessor.updateDoc2Doc(rawDoc, ctx)
    const txes: Tx[] = await getUpdateBacklinksTxes(control, txFactory, doc)

    if (txes.length !== 0) {
      await control.apply(txes, true)
    }
  }

  return []
}

async function BacklinksRemove (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const ctx = TxProcessor.extractTx(tx) as TxRemoveDoc<Doc>
  if (ctx._class !== core.class.TxRemoveDoc) return []
  if (hierarchy.isDerived(ctx.objectClass, chunter.class.Backlink)) return []

  const txFactory = new TxFactory(control.txFactory.account)

  const txes: Tx[] = await getRemoveBacklinksTxes(control, txFactory, ctx.objectId)
  if (txes.length !== 0) {
    await control.apply(txes, true)
  }

  return []
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
 * Sends notification to the message sender in case when DM
 * notifications are deleted or hidden. This is required for
 * the DM to re-appear in the sender's inbox.
 */
export async function OnMessageSent (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ptx = TxProcessor.extractTx(tx) as TxCreateDoc<Message>
  if (ptx._class !== core.class.TxCreateDoc) return []

  const message = TxProcessor.createDoc2Doc(ptx)
  if (message.createdBy === undefined) return []

  if (!control.hierarchy.isDerived(message.attachedToClass, chunter.class.DirectMessage)) return []

  const channel = (await control.findAll(chunter.class.DirectMessage, { _id: message.attachedTo })).shift()
  if (channel === undefined || channel.members.length !== 2 || !channel.private) return []

  const res: Tx[] = []

  const docUpdates = await control.findAll(notification.class.DocUpdates, { attachedTo: channel._id })

  // binding notification to the DM creation tx to properly display it in inbox
  const dmCreationTx = (
    await control.findAll(core.class.TxCreateDoc, { objectClass: channel._class, objectId: channel._id })
  ).shift()
  if (dmCreationTx === undefined) return []

  const sender = message.createdBy
  const docUpdate = docUpdates.find((du) => du.user === sender)
  if (docUpdate === undefined) {
    let anotherPerson: Ref<Account> | undefined
    for (const person of channel.members) {
      if (person !== sender) {
        anotherPerson = person
        break
      }
    }

    if (anotherPerson == null) return []

    pushNotification(control, res, sender, channel, dmCreationTx, docUpdates, anotherPerson)
  } else if (docUpdate.hidden) {
    res.push(control.txFactory.createTxUpdateDoc(docUpdate._class, docUpdate.space, docUpdate._id, { hidden: false }))
  }

  return res
}

  /**
 * @public
 */
export async function BacklinkTrigger (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const promises = [BacklinksCreate(tx, control), BacklinksUpdate(tx, control), BacklinksRemove(tx, control)]
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
    BacklinkTrigger,
    ChunterTrigger,
    OnMessageSent
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
