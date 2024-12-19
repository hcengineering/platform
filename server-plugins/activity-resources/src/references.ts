//
// Copyright © 2023 Hardcore Engineering Inc.
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

import activity, { ActivityMessage, ActivityReference, UserMentionInfo } from '@hcengineering/activity'
import contact, { Employee, Person, PersonAccount } from '@hcengineering/contact'
import core, {
  Account,
  Blob,
  Class,
  Data,
  Doc,
  generateId,
  Hierarchy,
  Ref,
  Space,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxFactory,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  Type,
  type MeasureContext
} from '@hcengineering/core'
import notification, { CommonInboxNotification, MentionInboxNotification } from '@hcengineering/notification'
import { StorageAdapter, TriggerControl } from '@hcengineering/server-core'
import {
  applyNotificationProviders,
  getCommonNotificationTxes,
  getNotificationContent,
  getNotificationProviderControl,
  getPushCollaboratorTx,
  isShouldNotifyTx,
  NotifyResult,
  shouldNotifyCommon,
  toReceiverInfo,
  type NotificationProviderControl
} from '@hcengineering/server-notification-resources'
import { areEqualJson, extractReferences, markupToPmNode, pmNodeToMarkup } from '@hcengineering/text'

export function isDocMentioned (doc: Ref<Doc>, content: string): boolean {
  const references = []

  const node = markupToPmNode(content)
  references.push(...extractReferences(node))

  for (const ref of references) {
    if (ref.objectId === doc) {
      return true
    }
  }

  return false
}

export async function getPersonNotificationTxes (
  ctx: MeasureContext,
  reference: Data<ActivityReference>,
  control: TriggerControl,
  senderId: Ref<Account>,
  space: Ref<Space>,
  originTx: TxCUD<Doc>,
  notificationControl: NotificationProviderControl
): Promise<Tx[]> {
  const receiverPersonId = reference.attachedTo as Ref<Person>
  const receiver = control.modelDb.getAccountByPersonId(receiverPersonId) as PersonAccount[]

  if (receiver.length === 0) {
    return []
  }

  if (receiver.some((it) => it._id === senderId)) {
    return []
  }

  const res: Tx[] = []
  const isAvailable = await checkSpace(receiver, space, control, res)

  if (!isAvailable) {
    return []
  }

  const doc = (await control.findAll(ctx, reference.srcDocClass, { _id: reference.srcDocId }))[0]

  const receiverPerson = (
    await control.findAll(
      ctx,
      contact.mixin.Employee,
      { _id: receiverPersonId as Ref<Employee>, active: true },
      { limit: 1 }
    )
  )[0]
  if (receiverPerson === undefined) return res

  const receiverSpace = (
    await control.findAll(ctx, contact.class.PersonSpace, { person: receiverPersonId }, { limit: 1 })
  )[0]
  if (receiverSpace === undefined) return res

  // TODO: Do we need for all or just one?
  const collaboratorsTx = await getCollaboratorsTxes(reference, control, receiver[0], doc)

  res.push(...collaboratorsTx)

  if (doc === undefined) {
    return res
  }

  const info = (
    await control.findAll<UserMentionInfo>(ctx, activity.class.UserMentionInfo, {
      user: receiverPersonId,
      attachedTo: reference.attachedDocId
    })
  )[0]

  if (info === undefined) {
    res.push(
      control.txFactory.createTxCreateDoc(activity.class.UserMentionInfo, space, {
        attachedTo: reference.attachedDocId ?? reference.srcDocId,
        attachedToClass: reference.attachedDocClass ?? reference.srcDocClass,
        user: receiverPersonId,
        content: reference.message,
        collection: 'mentions'
      })
    )
  } else {
    res.push(
      control.txFactory.createTxUpdateDoc(info._class, info.space, info._id, {
        content: reference.message
      })
    )
  }
  // TODO: Select a proper reciever
  const data: Omit<Data<MentionInboxNotification>, 'docNotifyContext'> = {
    header: activity.string.MentionedYouIn,
    messageHtml: reference.message,
    mentionedIn: reference.attachedDocId ?? reference.srcDocId,
    mentionedInClass: reference.attachedDocClass ?? reference.srcDocClass,
    user: receiver[0]._id,
    isViewed: false,
    archived: false
  }

  const sender = (
    await control.modelDb.findAll(contact.class.PersonAccount, { _id: senderId as Ref<PersonAccount> }, { limit: 1 })
  )[0]

  const senderPerson =
    sender !== undefined
      ? (await control.findAll(ctx, contact.class.Person, { _id: sender.person }, { limit: 1 }))[0]
      : undefined

  const receiverInfo = toReceiverInfo(control.hierarchy, {
    _id: receiver[0]._id,
    account: receiver[0],
    person: receiverPerson,
    space: receiverSpace._id
  })
  if (receiverInfo === undefined) return res

  const senderInfo = {
    _id: senderId,
    account: sender,
    person: senderPerson
  }

  const notifyResult = await shouldNotifyCommon(
    control,
    receiver.map((it) => it._id),
    notification.ids.MentionCommonNotificationType,
    notificationControl
  )
  const messageNotifyResult = await getMessageNotifyResult(
    reference,
    receiver,
    control,
    originTx,
    doc,
    notificationControl
  )

  for (const [provider] of messageNotifyResult.entries()) {
    if (notifyResult.has(provider)) {
      notifyResult.delete(provider)
    }
  }

  if (notifyResult.has(notification.providers.InboxNotificationProvider)) {
    const txes = await getCommonNotificationTxes(
      ctx,
      control,
      doc,
      data,
      receiverInfo,
      senderInfo,
      reference.srcDocId,
      reference.srcDocClass,
      doc.space,
      originTx.modifiedOn,
      notifyResult,
      notification.class.MentionInboxNotification,
      originTx
    )
    res.push(...txes)
  } else {
    const context = (
      await control.findAll(
        ctx,
        notification.class.DocNotifyContext,
        { objectId: reference.srcDocId, user: { $in: receiver.map((it) => it._id) } },
        { projection: { _id: 1 } }
      )
    )[0]
    if (context !== undefined) {
      const content = await getNotificationContent(originTx, receiver, senderInfo, doc, control)
      const notificationData: CommonInboxNotification = {
        ...data,
        ...content,
        docNotifyContext: context._id,
        _id: generateId(),
        _class: notification.class.MentionInboxNotification,
        space: receiverSpace._id,
        modifiedOn: originTx.modifiedOn,
        modifiedBy: sender._id
      }
      const subscriptions = await control.findAll(control.ctx, notification.class.PushSubscription, {
        user: receiverInfo._id
      })

      const msg = control.hierarchy.isDerived(data.mentionedInClass, activity.class.ActivityMessage)
        ? (await control.findAll(control.ctx, data.mentionedInClass, { _id: data.mentionedIn }))[0]
        : undefined
      await applyNotificationProviders(
        notificationData,
        notifyResult,
        reference.srcDocId,
        reference.srcDocClass,
        control,
        res,
        doc,
        receiverInfo,
        senderInfo,
        subscriptions,
        notification.class.MentionInboxNotification,
        msg as ActivityMessage
      )
    }
  }

  return res
}

async function checkSpace (
  users: PersonAccount[],
  spaceId: Ref<Space>,
  control: TriggerControl,
  res: Tx[]
): Promise<boolean> {
  const space = (await control.findAll<Space>(control.ctx, core.class.Space, { _id: spaceId }, { limit: 1 }))[0]
  const toAdd = users.filter((user) => !space.members.includes(user._id))
  const isMember = toAdd.length === 0
  if (space.private) {
    return isMember
  }

  if (!isMember) {
    for (const user of toAdd) {
      res.push(
        control.txFactory.createTxUpdateDoc(space._class, space.space, space._id, { $push: { members: user._id } })
      )
    }
  }

  return true
}

async function getCollaboratorsTxes (
  reference: Data<ActivityReference>,
  control: TriggerControl,
  receiver: Account,
  object?: Doc
): Promise<TxMixin<Doc, Doc>[]> {
  const { hierarchy } = control
  const res: TxMixin<Doc, Doc>[] = []

  if (object !== undefined) {
    // Add user to collaborators of object where user is mentioned
    const objectTx = getPushCollaboratorTx(control, receiver._id, object)

    if (objectTx !== undefined) {
      res.push(objectTx)
    }
  }

  if (reference.attachedDocClass === undefined || reference.attachedDocId === undefined) {
    return res
  }

  if (!hierarchy.isDerived(reference.attachedDocClass, activity.class.ActivityMessage)) {
    return res
  }

  const message = (
    await control.findAll<ActivityMessage>(
      control.ctx,
      reference.attachedDocClass,
      {
        _id: reference.attachedDocId as Ref<ActivityMessage>
      },
      { limit: 1 }
    )
  )[0]

  if (message === undefined) {
    return res
  }

  // Add user to collaborators of message where user is mentioned
  const messageTx = getPushCollaboratorTx(control, receiver._id, message)

  if (messageTx !== undefined) {
    res.push(messageTx)
  }

  return res
}

async function getMessageNotifyResult (
  reference: Data<ActivityReference>,
  account: PersonAccount[],
  control: TriggerControl,
  tx: TxCUD<Doc>,
  doc: Doc,
  notificationControl: NotificationProviderControl
): Promise<NotifyResult> {
  const { hierarchy } = control

  if (
    reference.attachedDocClass === undefined ||
    reference.attachedDocId === undefined ||
    tx._class !== core.class.TxCreateDoc
  ) {
    return new Map()
  }

  const mixin = control.hierarchy.as(doc, notification.mixin.Collaborators)

  if (mixin === undefined || !account.some((account) => mixin.collaborators.includes(account._id))) {
    return new Map()
  }

  if (!hierarchy.isDerived(reference.attachedDocClass, activity.class.ActivityMessage)) {
    return new Map()
  }

  return await isShouldNotifyTx(control, tx, doc, account, false, false, notificationControl, undefined)
}

function isMarkupType (type: Ref<Class<Type<any>>>): boolean {
  return type === core.class.TypeMarkup
}

function isCollaborativeType (type: Ref<Class<Type<any>>>): boolean {
  return type === core.class.TypeCollaborativeDoc
}

async function getCreateReferencesTxes (
  ctx: MeasureContext,
  control: TriggerControl,
  storage: StorageAdapter,
  txFactory: TxFactory,
  createdDoc: Doc,
  srcDocId: Ref<Doc>,
  srcDocClass: Ref<Class<Doc>>,
  srcDocSpace: Ref<Space>,
  originTx: TxCUD<Doc>
): Promise<Tx[]> {
  const attachedDocId = createdDoc._id
  const attachedDocClass = createdDoc._class

  const refs: Data<ActivityReference>[] = []
  const attributes = control.hierarchy.getAllAttributes(createdDoc._class)

  for (const attr of attributes.values()) {
    if (isMarkupType(attr.type._class)) {
      const content: string = (createdDoc as any)[attr.name]?.toString() ?? ''
      const attrReferences = getReferencesData(srcDocId, srcDocClass, attachedDocId, attachedDocClass, content)

      refs.push(...attrReferences)
    } else if (attr.type._class === core.class.TypeCollaborativeDoc) {
      const blobId = (createdDoc as any)[attr.name] as Ref<Blob>
      if (blobId != null) {
        try {
          const buffer = await storage.read(ctx, control.workspace, blobId)
          const markup = Buffer.concat(buffer as any).toString()
          const attrReferences = getReferencesData(srcDocId, srcDocClass, attachedDocId, attachedDocClass, markup)
          refs.push(...attrReferences)
        } catch {
          // do nothing, the collaborative doc does not sem to exist yet
        }
      }
    }
  }

  const refSpace: Ref<Space> = control.hierarchy.isDerived(srcDocClass, core.class.Space)
    ? (srcDocId as Ref<Space>)
    : srcDocSpace

  return await getReferencesTxes(ctx, control, txFactory, refs, refSpace, [], [], originTx)
}

async function getUpdateReferencesTxes (
  ctx: MeasureContext,
  control: TriggerControl,
  storage: StorageAdapter,
  txFactory: TxFactory,
  updatedDoc: Doc,
  srcDocId: Ref<Doc>,
  srcDocClass: Ref<Class<Doc>>,
  srcDocSpace: Ref<Space>,
  originTx: TxCUD<Doc>
): Promise<Tx[]> {
  const attachedDocId = updatedDoc._id
  const attachedDocClass = updatedDoc._class

  // collect attribute references
  let hasReferenceAttrs = false
  const references: Data<ActivityReference>[] = []
  const attributes = control.hierarchy.getAllAttributes(updatedDoc._class)
  for (const attr of attributes.values()) {
    if (isMarkupType(attr.type._class)) {
      hasReferenceAttrs = true
      const content: string = (updatedDoc as any)[attr.name]?.toString() ?? ''
      const attrReferences = getReferencesData(srcDocId, srcDocClass, attachedDocId, attachedDocClass, content)
      references.push(...attrReferences)
    } else if (attr.type._class === core.class.TypeCollaborativeDoc) {
      hasReferenceAttrs = true
      try {
        const blobId = (updatedDoc as any)[attr.name] as Ref<Blob>
        if (blobId != null) {
          const buffer = await storage.read(ctx, control.workspace, blobId)
          const markup = Buffer.concat(buffer as any).toString()
          const attrReferences = getReferencesData(srcDocId, srcDocClass, attachedDocId, attachedDocClass, markup)
          references.push(...attrReferences)
        }
      } catch {
        // do nothing, the collaborative doc does not sem to exist yet
      }
    }
  }

  // There is a chance that references are managed manually
  // do not update references if there are no reference sources in the doc
  if (hasReferenceAttrs) {
    const current = await control.findAll(ctx, activity.class.ActivityReference, {
      srcDocId,
      srcDocClass,
      attachedDocId,
      collection: 'references'
    })
    const userMentions = await control.findAll(ctx, activity.class.UserMentionInfo, {
      attachedTo: attachedDocId
    })

    const refSpace: Ref<Space> = control.hierarchy.isDerived(srcDocClass, core.class.Space)
      ? (srcDocId as Ref<Space>)
      : srcDocSpace

    return await getReferencesTxes(ctx, control, txFactory, references, refSpace, current, userMentions, originTx)
  }

  return []
}

export function getReferencesData (
  srcDocId: Ref<Doc>,
  srcDocClass: Ref<Class<Doc>>,
  attachedDocId: Ref<Doc> | undefined,
  attachedDocClass: Ref<Class<Doc>> | undefined,
  content: string
): Array<Data<ActivityReference>> {
  const result: Array<Data<ActivityReference>> = []
  const references = []

  const doc = markupToPmNode(content)
  references.push(...extractReferences(doc))

  for (const ref of references) {
    if (ref.objectId !== attachedDocId && ref.objectId !== srcDocId) {
      result.push({
        attachedTo: ref.objectId,
        attachedToClass: ref.objectClass,
        collection: 'references',
        srcDocId,
        srcDocClass,
        message: ref.parentNode !== null ? pmNodeToMarkup(ref.parentNode) : '',
        attachedDocId,
        attachedDocClass
      })
    }
  }

  return result
}

async function createReferenceTxes (
  ctx: MeasureContext,
  control: TriggerControl,
  txFactory: TxFactory,
  ref: Data<ActivityReference>,
  space: Ref<Space>,
  originTx: TxCUD<Doc>,
  notificationControl: NotificationProviderControl
): Promise<Tx[]> {
  if (control.hierarchy.isDerived(ref.attachedToClass, contact.class.Person)) {
    return await getPersonNotificationTxes(ctx, ref, control, txFactory.account, space, originTx, notificationControl)
  }

  const refTx = control.txFactory.createTxCreateDoc(activity.class.ActivityReference, space, ref)
  const tx = control.txFactory.createTxCollectionCUD(ref.attachedToClass, ref.attachedTo, space, ref.collection, refTx)

  return [tx]
}

async function getReferencesTxes (
  ctx: MeasureContext,
  control: TriggerControl,
  txFactory: TxFactory,
  references: Data<ActivityReference>[],
  space: Ref<Space>,
  current: ActivityReference[],
  mentions: UserMentionInfo[],
  originTx: TxCUD<Doc>
): Promise<Tx[]> {
  const txes: Tx[] = []

  for (const c of current) {
    // Find existing and check if we need to update message
    const pos = references.findIndex(
      (b) => b.srcDocId === c.srcDocId && b.srcDocClass === c.srcDocClass && b.attachedTo === c.attachedTo
    )
    if (pos !== -1) {
      // Update existing references when message changed
      const data = references[pos]
      if (c.message !== data.message) {
        const innerTx = txFactory.createTxUpdateDoc(c._class, c.space, c._id, {
          message: data.message
        })
        txes.push(txFactory.createTxCollectionCUD(c.attachedToClass, c.attachedTo, c.space, c.collection, innerTx))
      }
      references.splice(pos, 1)
    } else {
      // Remove not found references
      const innerTx = txFactory.createTxRemoveDoc(c._class, c.space, c._id)
      txes.push(txFactory.createTxCollectionCUD(c.attachedToClass, c.attachedTo, c.space, c.collection, innerTx))
    }
  }

  const notificationControl = await getNotificationProviderControl(ctx, control)

  for (const mention of mentions) {
    const refIndex = references.findIndex(
      (r) => mention.user === r.attachedTo && mention.attachedTo === r.attachedDocId
    )

    const ref = references[refIndex]

    if (refIndex !== -1) {
      const alreadyProcessed = areEqualJson(JSON.parse(mention.content), JSON.parse(ref.message))

      if (alreadyProcessed) {
        references.splice(refIndex, 1)
      }
    } else {
      txes.push(txFactory.createTxRemoveDoc(mention._class, mention.space, mention._id))
    }
  }

  // Add missing references
  for (const ref of references) {
    txes.push(...(await createReferenceTxes(ctx, control, txFactory, ref, space, originTx, notificationControl)))
  }

  return txes
}

async function getRemoveActivityReferenceTxes (
  control: TriggerControl,
  txFactory: TxFactory,
  removedDocId: Ref<Doc>
): Promise<Tx[]> {
  const txes: Tx[] = []
  const refs = await control.findAll(control.ctx, activity.class.ActivityReference, {
    attachedDocId: removedDocId,
    collection: 'references'
  })

  const mentions = await control.findAll(control.ctx, activity.class.UserMentionInfo, {
    attachedTo: removedDocId
  })

  for (const ref of refs) {
    const removeTx = txFactory.createTxRemoveDoc(ref._class, ref.space, ref._id)
    txes.push(txFactory.createTxCollectionCUD(ref.attachedToClass, ref.attachedTo, ref.space, ref.collection, removeTx))
  }

  for (const mention of mentions) {
    const removeTx = txFactory.createTxRemoveDoc(mention._class, mention.space, mention._id)
    txes.push(
      txFactory.createTxCollectionCUD(
        mention.attachedToClass,
        mention.attachedTo,
        mention.space,
        mention.collection,
        removeTx
      )
    )
  }

  return txes
}

function guessReferenceObj (
  hierarchy: Hierarchy,
  tx: TxCUD<Doc>
): {
    objectId: Ref<Doc>
    objectClass: Ref<Class<Doc>>
  } {
  // Try to guess reference target Tx for TxCollectionCUD txes based on collaborators availability
  if (tx.attachedToClass !== undefined && tx.attachedTo !== undefined) {
    if (hierarchy.isDerived(tx.objectClass, activity.class.ActivityMessage)) {
      return {
        objectId: tx.attachedTo,
        objectClass: tx.attachedToClass
      }
    }

    const mixin = hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)
    return mixin !== undefined
      ? {
          objectId: tx.objectId,
          objectClass: tx.objectClass
        }
      : {
          objectId: tx.attachedTo,
          objectClass: tx.attachedToClass
        }
  }
  return {
    objectId: tx.objectId,
    objectClass: tx.objectClass
  }
}

async function ActivityReferenceCreate (tx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const ctx = tx as TxCreateDoc<Doc>

  if (ctx._class !== core.class.TxCreateDoc) return []
  if (control.hierarchy.isDerived(ctx.objectClass, notification.class.InboxNotification)) return []
  if (control.hierarchy.isDerived(ctx.objectClass, activity.class.ActivityReference)) return []

  const txFactory = new TxFactory(control.txFactory.account)

  const doc = TxProcessor.createDoc2Doc(ctx)
  const target = guessReferenceObj(control.hierarchy, tx)

  const txes: Tx[] = await getCreateReferencesTxes(
    control.ctx,
    control,
    control.storageAdapter,
    txFactory,
    doc,
    target.objectId,
    target.objectClass,
    tx.objectSpace,
    tx
  )

  if (txes.length !== 0) {
    await control.apply(control.ctx, txes)
  }

  return []
}

async function ActivityReferenceUpdate (tx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const ctx = tx as TxUpdateDoc<Doc>
  const attributes = control.hierarchy.getAllAttributes(ctx.objectClass)

  let hasUpdates = false

  for (const attr of attributes.values()) {
    if (isMarkupType(attr.type._class) || isCollaborativeType(attr.type._class)) {
      if (TxProcessor.txHasUpdate(ctx, attr.name)) {
        hasUpdates = true
        break
      }
    }
  }

  if (!hasUpdates) {
    return []
  }

  const rawDoc = (await control.findAll(control.ctx, ctx.objectClass, { _id: ctx.objectId }))[0]

  if (rawDoc === undefined) {
    return []
  }

  const txFactory = new TxFactory(control.txFactory.account)
  const doc = TxProcessor.updateDoc2Doc(rawDoc, ctx)
  const target = guessReferenceObj(control.hierarchy, tx)

  const txes: Tx[] = await getUpdateReferencesTxes(
    control.ctx,
    control,
    control.storageAdapter,
    txFactory,
    doc,
    target.objectId,
    target.objectClass,
    tx.objectSpace,
    tx
  )

  if (txes.length !== 0) {
    await control.apply(control.ctx, txes)
  }

  return []
}

async function ActivityReferenceRemove (tx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const ctx = tx as TxRemoveDoc<Doc>
  const attributes = control.hierarchy.getAllAttributes(ctx.objectClass)

  let hasMarkdown = false

  for (const attr of attributes.values()) {
    if (isMarkupType(attr.type._class) || isCollaborativeType(attr.type._class)) {
      hasMarkdown = true
      break
    }
  }

  if (hasMarkdown) {
    const txFactory = new TxFactory(control.txFactory.account)

    const txes: Tx[] = await getRemoveActivityReferenceTxes(control, txFactory, ctx.objectId)
    if (txes.length !== 0) {
      await control.apply(control.ctx, txes)
    }
  }

  return []
}

/**
 * @public
 */
export async function ReferenceTrigger (txes: TxCUD<Doc>[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []

  for (const tx of txes) {
    if (control.hierarchy.isDerived(tx.objectClass, activity.class.ActivityReference)) {
      continue
    }
    if (control.hierarchy.isDerived(tx.objectClass, notification.class.InboxNotification)) {
      continue
    }

    if (tx._class === core.class.TxCreateDoc) {
      result.push(...(await ActivityReferenceCreate(tx, control)))
    }
    if (tx._class === core.class.TxUpdateDoc) {
      result.push(...(await ActivityReferenceUpdate(tx, control)))
    }
    if (tx._class === core.class.TxRemoveDoc) {
      result.push(...(await ActivityReferenceRemove(tx, control)))
    }
  }
  return result
}
