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

import activity, { type ActivityMessage, type ActivityReference, type UserMentionInfo } from '@hcengineering/activity'
import contact, { type Employee, type Person } from '@hcengineering/contact'
import core, {
  type AccountUuid,
  type Blob,
  type Class,
  type Data,
  type Doc,
  type Hierarchy,
  type Markup,
  type MeasureContext,
  type ModelDb,
  type PersonId,
  type Ref,
  type Space,
  type Tx,
  type TxCreateDoc,
  type TxCUD,
  TxFactory,
  TxProcessor,
  type TxRemoveDoc,
  type TxUpdateDoc,
  type Type
} from '@hcengineering/core'
import notification, {
  getClassCollaborators,
  type MentionInboxNotification,
  type NotificationType
} from '@hcengineering/notification'
import { getPerson } from '@hcengineering/server-contact'
import { type StorageAdapter, type TriggerControl } from '@hcengineering/server-core'
import {
  getAllowedProviders,
  getCommonNotificationTxes,
  getNotificationProviderControl,
  getReceiversInfo,
  type NotificationProviderControl
} from '@hcengineering/server-notification-resources'
import { areEqualJson, extractReferences, jsonToMarkup, markupToJSON } from '@hcengineering/text-core'

export function isDocMentioned (doc: Ref<Doc>, content: string): boolean {
  const references = []

  const node = markupToJSON(content)
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
  senderId: PersonId,
  space: Ref<Space>,
  originTx: TxCUD<Doc>,
  notificationControl: NotificationProviderControl
): Promise<Tx[]> {
  const { hierarchy } = control
  const res: Tx[] = []
  const receiverPersonRef = reference.attachedTo as Ref<Person>
  const info = (
    await control.findAll<UserMentionInfo>(ctx, activity.class.UserMentionInfo, {
      user: receiverPersonRef,
      attachedTo: reference.attachedDocId
    })
  )[0]

  res.push(getUpdateMentionInfoTx(control, reference, space, info))

  if (
    originTx._class === core.class.TxCreateDoc &&
    hierarchy.isDerived(originTx.objectClass, activity.class.ActivityMessage)
  ) {
    return res
  }

  if (info !== undefined && hierarchy.isDerived(originTx.objectClass, activity.class.ActivityMessage)) {
    return res
  }

  const doc = (await control.findAll(ctx, reference.srcDocClass, { _id: reference.srcDocId }))[0]
  if (doc === undefined) return res
  const docSpace = (await control.findAll<Space>(control.ctx, core.class.Space, { _id: space }, { limit: 1 }))[0]
  if (docSpace === undefined) return res

  const senderAccount = control.ctx.contextData.socialStringsToUsers.get(senderId)?.accontUuid

  let collaborators: AccountUuid[] = []

  if ([contact.mention.Everyone, contact.mention.Here].includes(reference.attachedTo as Ref<Employee>)) {
    collaborators = await getMultipleMentionCollaborators(ctx, reference, control, doc)
  } else {
    const employee = (
      await control.findAll(ctx, contact.mixin.Employee, { _id: reference.attachedTo as Ref<Employee> })
    )[0]
    if (employee?.personUuid != null && employee.personUuid !== senderAccount) {
      collaborators = [employee.personUuid]

      const collaboratorsTx = getCollaboratorsTxes(control, employee.personUuid, doc)

      res.push(...collaboratorsTx)
    }
  }

  const filteredCollaborators = collaborators.filter(
    (c) => c !== senderAccount && checkSpace(c, docSpace, control, res)
  )

  if (filteredCollaborators.length === 0) return res
  const receivers = await getReceiversInfo(ctx, filteredCollaborators, control)
  if (receivers.length === 0) return []
  const senderPerson = await getPerson(control, senderId)
  const sender = {
    socialId: senderId,
    person: senderPerson
  }
  const type: NotificationType = control.modelDb.findAllSync(notification.class.NotificationType, {
    _id: notification.ids.MentionNotificationType
  })[0]
  for (const receiver of receivers) {
    const data: Omit<Data<MentionInboxNotification>, 'docNotifyContext'> = {
      header: activity.string.MentionedYouIn,
      messageHtml: reference.message,
      mentionedIn: reference.attachedDocId ?? reference.srcDocId,
      mentionedInClass: reference.attachedDocClass ?? reference.srcDocClass,
      objectId: reference.srcDocId,
      objectClass: reference.srcDocClass,
      user: receiver.account,
      isViewed: false,
      archived: false
    }

    const allowedProviders = getAllowedProviders(control, receiver.socialIds, type, notificationControl)
    const notifyResult = new Map(allowedProviders.map((it) => [it, [type]]))

    if (notifyResult.has(notification.providers.InboxNotificationProvider)) {
      const txes = await getCommonNotificationTxes(
        control.ctx,
        control,
        doc,
        data,
        receiver,
        sender,
        reference.srcDocId,
        reference.srcDocClass,
        doc.space,
        originTx.modifiedOn,
        notifyResult,
        notification.class.MentionInboxNotification,
        originTx
      )
      res.push(...txes)
    }
  }
  return res
}

function getUpdateMentionInfoTx (
  control: TriggerControl,
  reference: Data<ActivityReference>,
  space: Ref<Space>,
  info?: UserMentionInfo
): Tx {
  if (info === undefined) {
    return control.txFactory.createTxCreateDoc(activity.class.UserMentionInfo, space, {
      attachedTo: reference.attachedDocId ?? reference.srcDocId,
      attachedToClass: reference.attachedDocClass ?? reference.srcDocClass,
      user: reference.attachedTo as Ref<Person>,
      content: reference.message,
      collection: 'mentions'
    })
  }

  return control.txFactory.createTxUpdateDoc(info._class, info.space, info._id, {
    content: reference.message
  })
}

async function getMultipleMentionCollaborators (
  ctx: MeasureContext,
  reference: Data<ActivityReference>,
  control: TriggerControl,
  doc: Doc
): Promise<AccountUuid[]> {
  const { hierarchy, modelDb } = control
  const personRef = reference.attachedTo as Ref<Person>

  const classCollaborators = getClassCollaborators(modelDb, hierarchy, doc._class)

  if (classCollaborators === undefined) return []
  const collaborators = (
    await control.findAll(ctx, core.class.Collaborator, {
      attachedTo: doc._id
    })
  ).map((it) => it.collaborator)

  if (collaborators.length === 0) return []
  const statuses = Array.from(control.userStatusMap.values())

  return personRef === contact.mention.Here
    ? collaborators.filter((it) => statuses.some((s) => s.online && s.user === it))
    : collaborators
}

function checkSpace (account: AccountUuid, space: Space, control: TriggerControl, res: Tx[]): boolean {
  const isMember = space.members.includes(account)

  if (space.private) {
    return isMember
  }

  if (!isMember) {
    res.push(control.txFactory.createTxUpdateDoc(space._class, space.space, space._id, { $push: { members: account } }))
  }

  return true
}

function getCollaboratorsTxes (control: TriggerControl, receiver: AccountUuid, object?: Doc): Tx[] {
  const res: Tx[] = []

  if (object !== undefined) {
    const tx = control.txFactory.createTxCreateDoc(core.class.Collaborator, object.space, {
      attachedTo: object._id,
      collaborator: receiver,
      attachedToClass: object._class,
      collection: 'collaborators'
    })

    res.push(tx)
  }

  return res
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
      if (blobId != null && blobId !== '') {
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
  content: Markup
): Array<Data<ActivityReference>> {
  const result: Array<Data<ActivityReference>> = []
  const references = []

  const node = markupToJSON(content)
  references.push(...extractReferences(node))

  for (const ref of references) {
    if (ref.objectId !== attachedDocId && ref.objectId !== srcDocId) {
      result.push({
        attachedTo: ref.objectId,
        attachedToClass: ref.objectClass,
        collection: 'references',
        srcDocId,
        srcDocClass,
        message: ref.parentNode !== null ? jsonToMarkup(ref.parentNode) : '',
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

async function getRemoveMentionTxes (
  control: TriggerControl,
  mention: UserMentionInfo,
  originTx: TxCUD<Doc>
): Promise<Tx[]> {
  const res: Tx[] = []
  res.push(control.txFactory.createTxRemoveDoc(mention._class, mention.space, mention._id))

  if (control.hierarchy.isDerived(originTx.objectClass, activity.class.ActivityMessage)) {
    const _id = originTx.objectId as Ref<ActivityMessage>
    const person = (
      await control.findAll(control.ctx, contact.mixin.Employee, { _id: mention.user as Ref<Employee> })
    )[0]
    if (person?.personUuid !== undefined) {
      const activityNotification = await control.findAll(control.ctx, notification.class.ActivityInboxNotification, {
        attachedTo: _id,
        user: person.personUuid
      })
      const mentionNotifications = await control.findAll(control.ctx, notification.class.MentionInboxNotification, {
        mentionedIn: _id,
        user: person.personUuid
      })
      res.push(
        ...activityNotification
          .filter((it) => it.types?.length === 1 && it.types[0] === notification.ids.MentionNotificationType)
          .map((it) => control.txFactory.createTxRemoveDoc(it._class, it.space, it._id))
      )

      res.push(...mentionNotifications.map((it) => control.txFactory.createTxRemoveDoc(it._class, it.space, it._id)))
    }
  }

  return res
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
      const removeTxes = await getRemoveMentionTxes(control, mention, originTx)
      txes.push(...removeTxes)
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

  const notifications = await control.findAll(control.ctx, notification.class.MentionInboxNotification, {
    mentionedIn: removedDocId
  })

  for (const notification of notifications) {
    const removeTx = txFactory.createTxRemoveDoc(notification._class, notification.space, notification._id)
    txes.push(removeTx)
  }
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
  modelDb: ModelDb,
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

    const mixin = getClassCollaborators(modelDb, hierarchy, tx.objectClass)
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
  const target = guessReferenceObj(control.modelDb, control.hierarchy, tx)

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
  const target = guessReferenceObj(control.modelDb, control.hierarchy, tx)

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
    if (control.hierarchy.isDerived(tx.objectClass, activity.class.ActivityReference)) continue
    if (control.hierarchy.isDerived(tx.objectClass, notification.class.InboxNotification)) continue
    if (control.hierarchy.isDerived(tx.objectClass, activity.class.UserMentionInfo)) continue

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
