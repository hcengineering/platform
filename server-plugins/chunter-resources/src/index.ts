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

import chunter, {
  Backlink,
  chunterId,
  ChunterSpace,
  Comment,
  DirectMessage,
  Message,
  ThreadMessage
} from '@hcengineering/chunter'
import contact, { Employee, PersonAccount } from '@hcengineering/contact'
import core, {
  Account,
  AttachedDoc,
  Class,
  concatLink,
  Data,
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
  TxUpdateDoc,
  Type
} from '@hcengineering/core'
import notification, { Collaborators, NotificationType, NotificationContent } from '@hcengineering/notification'
import { getMetadata, IntlString } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import { getDocCollaborators, getMixinTx, pushNotification } from '@hcengineering/server-notification-resources'
import { workbenchId } from '@hcengineering/workbench'
import { stripTags } from '@hcengineering/text'
import { getBacklinks, getBacklinksTxes } from './backlinks'

export { getBacklinksTxes } from './backlinks'

function isMarkupType (type: Ref<Class<Type<any>>>): boolean {
  return type === core.class.TypeMarkup || type === core.class.TypeCollaborativeMarkup
}

function getCreateBacklinksTxes (
  control: TriggerControl,
  txFactory: TxFactory,
  doc: Doc,
  backlinkId: Ref<Doc>,
  backlinkClass: Ref<Class<Doc>>
): Tx[] {
  const attachedDocId = doc._id

  const backlinks: Data<Backlink>[] = []
  const attributes = control.hierarchy.getAllAttributes(doc._class)
  for (const attr of attributes.values()) {
    if (isMarkupType(attr.type._class)) {
      const content = (doc as any)[attr.name]?.toString() ?? ''
      const attrBacklinks = getBacklinks(backlinkId, backlinkClass, attachedDocId, content)
      backlinks.push(...attrBacklinks)
    }
  }

  return getBacklinksTxes(txFactory, backlinks, [])
}

async function getUpdateBacklinksTxes (
  control: TriggerControl,
  txFactory: TxFactory,
  doc: Doc,
  backlinkId: Ref<Doc>,
  backlinkClass: Ref<Class<Doc>>
): Promise<Tx[]> {
  const attachedDocId = doc._id

  // collect attribute backlinks
  let hasBacklinkAttrs = false
  const backlinks: Data<Backlink>[] = []
  const attributes = control.hierarchy.getAllAttributes(doc._class)
  for (const attr of attributes.values()) {
    if (isMarkupType(attr.type._class)) {
      hasBacklinkAttrs = true
      const content = (doc as any)[attr.name]?.toString() ?? ''
      const attrBacklinks = getBacklinks(backlinkId, backlinkClass, attachedDocId, content)
      backlinks.push(...attrBacklinks)
    }
  }

  // There is a chance that backlinks are managed manually
  // do not update backlinks if there are no backlink sources in the doc
  if (hasBacklinkAttrs) {
    const current = await control.findAll(chunter.class.Backlink, {
      backlinkId,
      backlinkClass,
      attachedDocId,
      collection: 'backlinks'
    })

    return getBacklinksTxes(txFactory, backlinks, current)
  }

  return []
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

function guessBacklinkTx (hierarchy: Hierarchy, tx: TxCUD<Doc>): TxCUD<Doc> {
  // Try to guess backlink target Tx for TxCollectionCUD txes based on collaborators availability
  if (hierarchy.isDerived(tx._class, core.class.TxCollectionCUD)) {
    const cltx = tx as TxCollectionCUD<Doc, AttachedDoc>
    tx = TxProcessor.extractTx(cltx) as TxCUD<Doc>

    const mixin = hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)
    return mixin !== undefined ? tx : cltx
  }
  return tx
}

async function BacklinksCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ctx = TxProcessor.extractTx(tx) as TxCreateDoc<Doc>
  if (ctx._class !== core.class.TxCreateDoc) return []
  if (control.hierarchy.isDerived(ctx.objectClass, chunter.class.Backlink)) return []

  const txFactory = new TxFactory(control.txFactory.account)

  const doc = TxProcessor.createDoc2Doc(ctx)
  const targetTx = guessBacklinkTx(control.hierarchy, tx as TxCUD<Doc>)
  const txes: Tx[] = getCreateBacklinksTxes(control, txFactory, doc, targetTx.objectId, targetTx.objectClass)

  if (txes.length !== 0) {
    await control.apply(txes, true)
  }

  return []
}

async function BacklinksUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ctx = TxProcessor.extractTx(tx) as TxUpdateDoc<Doc>

  let hasUpdates = false
  const attributes = control.hierarchy.getAllAttributes(ctx.objectClass)
  for (const attr of attributes.values()) {
    if (isMarkupType(attr.type._class) && attr.name in ctx.operations) {
      hasUpdates = true
      break
    }
  }

  if (hasUpdates) {
    const rawDoc = (await control.findAll(ctx.objectClass, { _id: ctx.objectId }))[0]

    if (rawDoc !== undefined) {
      const txFactory = new TxFactory(control.txFactory.account)

      const doc = TxProcessor.updateDoc2Doc(rawDoc, ctx)
      const targetTx = guessBacklinkTx(control.hierarchy, tx as TxCUD<Doc>)
      const txes: Tx[] = await getUpdateBacklinksTxes(control, txFactory, doc, targetTx.objectId, targetTx.objectClass)

      if (txes.length !== 0) {
        await control.apply(txes, true)
      }
    }
  }

  return []
}

async function BacklinksRemove (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ctx = TxProcessor.extractTx(tx) as TxRemoveDoc<Doc>

  let hasMarkdown = false
  const attributes = control.hierarchy.getAllAttributes(ctx.objectClass)
  for (const attr of attributes.values()) {
    if (isMarkupType(attr.type._class)) {
      hasMarkdown = true
      break
    }
  }

  if (hasMarkdown) {
    const txFactory = new TxFactory(control.txFactory.account)

    const txes: Tx[] = await getRemoveBacklinksTxes(control, txFactory, ctx.objectId)
    if (txes.length !== 0) {
      await control.apply(txes, true)
    }
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

    await pushNotification(control, res, sender, channel, dmCreationTx, docUpdates, anotherPerson)
  } else if (docUpdate.hidden) {
    res.push(control.txFactory.createTxUpdateDoc(docUpdate._class, docUpdate.space, docUpdate._id, { hidden: false }))
  }

  return res
}

/**
 * @public
 */
export async function BacklinkTrigger (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []

  const ctx = TxProcessor.extractTx(tx) as TxCreateDoc<Doc>
  if (control.hierarchy.isDerived(ctx.objectClass, chunter.class.Backlink)) return []

  if (ctx._class === core.class.TxCreateDoc) {
    result.push(...(await BacklinksCreate(tx, control)))
  }
  if (ctx._class === core.class.TxUpdateDoc) {
    result.push(...(await BacklinksUpdate(tx, control)))
  }
  if (ctx._class === core.class.TxRemoveDoc) {
    result.push(...(await BacklinksRemove(tx, control)))
  }
  return result
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
  const dm = (await control.findAll(chunter.class.DirectMessage, { _id: doc._id as Ref<DirectMessage> }))[0]
  return dm !== undefined
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

/**
 * @public
 */
export async function IsThreadMessage (
  tx: Tx,
  doc: Doc,
  user: Ref<Account>,
  type: NotificationType,
  control: TriggerControl
): Promise<boolean> {
  const space = (await control.findAll(chunter.class.DirectMessage, { _id: doc.space }))[0]
  return space !== undefined
}

const NOTIFICATION_BODY_SIZE = 50
/**
 * @public
 */
export async function getChunterNotificationContent (
  doc: Doc,
  tx: TxCUD<Doc>,
  target: Ref<Account>,
  control: TriggerControl
): Promise<NotificationContent> {
  const title: IntlString = chunter.string.DirectNotificationTitle
  let body: IntlString = chunter.string.Message
  const intlParams: Record<string, string | number> = {}

  let message: string | undefined

  if (tx._class === core.class.TxCollectionCUD) {
    const ptx = tx as TxCollectionCUD<Doc, AttachedDoc>
    if (ptx.tx._class === core.class.TxCreateDoc) {
      if (ptx.tx.objectClass === chunter.class.Message) {
        const createTx = ptx.tx as TxCreateDoc<Message>
        message = createTx.attributes.content
      } else if (ptx.tx.objectClass === chunter.class.Backlink) {
        const createTx = ptx.tx as TxCreateDoc<Backlink>
        message = createTx.attributes.message
      }
    }
  }

  if (message !== undefined) {
    const plainTextMessage = stripTags(message, NOTIFICATION_BODY_SIZE)
    intlParams.message = plainTextMessage
    body = chunter.string.DirectNotificationBody
  }

  return {
    title,
    body,
    intlParams
  }
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
    ChunterNotificationContentProvider: getChunterNotificationContent,
    IsDirectMessage,
    IsThreadMessage,
    IsMeMentioned,
    IsChannelMessage
  }
})
