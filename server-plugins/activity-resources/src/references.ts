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

import { loadCollaborativeDoc, yDocToBuffer } from '@hcengineering/collaboration'
import core, {
  Account,
  AttachedDoc,
  Class,
  CollaborativeDoc,
  Data,
  Doc,
  Hierarchy,
  Ref,
  Space,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxFactory,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  Type
} from '@hcengineering/core'
import notification, { MentionInboxNotification } from '@hcengineering/notification'
import { extractReferences, markupToPmNode, pmNodeToMarkup, yDocContentToNodes } from '@hcengineering/text'
import { StorageAdapter, TriggerControl } from '@hcengineering/server-core'
import activity, { ActivityMessage, ActivityReference } from '@hcengineering/activity'
import contact, { Person, PersonAccount } from '@hcengineering/contact'
import {
  getPushCollaboratorTx,
  getCommonNotificationTxes,
  isMessageAlreadyNotified,
  shouldNotifyCommon
} from '@hcengineering/server-notification-resources'

export function isDocMentioned (doc: Ref<Doc>, content: string | Buffer): boolean {
  const references = []

  if (content instanceof Buffer) {
    const nodes = yDocContentToNodes(content)
    for (const node of nodes) {
      references.push(...extractReferences(node))
    }
  } else {
    const doc = markupToPmNode(content)
    references.push(...extractReferences(doc))
  }

  for (const ref of references) {
    if (ref.objectId === doc) {
      return true
    }
  }

  return false
}

export async function getPersonNotificationTxes (
  reference: Data<ActivityReference>,
  control: TriggerControl,
  senderId: Ref<Account>,
  space: Ref<Space>,
  originTx: TxCUD<Doc>
): Promise<Tx[]> {
  const receiver = (
    await control.modelDb.findAll(
      contact.class.PersonAccount,
      {
        person: reference.attachedTo as Ref<Person>
      },
      { limit: 1 }
    )
  )[0]

  if (receiver === undefined) {
    return []
  }

  if (receiver._id === senderId) {
    return []
  }

  const isAvailable = await isSpaceAvailable(receiver, space, control)

  if (!isAvailable) {
    return []
  }

  const res: Tx[] = []
  const collaboratorsTx = await getCollaboratorsTxes(reference, control, receiver)

  if (collaboratorsTx !== undefined) {
    res.push(collaboratorsTx)
  }

  const doc = (await control.findAll(reference.srcDocClass, { _id: reference.srcDocId }))[0]

  if (doc === undefined) {
    return res
  }

  const data: Partial<Data<MentionInboxNotification>> = {
    header: activity.string.MentionedYouIn,
    messageHtml: reference.message,
    mentionedIn: reference.attachedDocId,
    mentionedInClass: reference.attachedDocClass
  }

  const notifyResult = await shouldNotifyCommon(control, receiver._id, notification.ids.MentionCommonNotificationType)

  if (await isReferenceAlreadyNotified(reference, receiver._id, control)) {
    notifyResult.allowed = false
  }

  const texes = await getCommonNotificationTxes(
    control,
    doc,
    data,
    receiver._id,
    senderId,
    reference.srcDocId,
    reference.srcDocClass,
    space,
    originTx.modifiedOn,
    notifyResult,
    notification.class.MentionInboxNotification
  )

  res.push(...texes)
  return res
}

async function isSpaceAvailable (user: PersonAccount, spaceId: Ref<Space>, control: TriggerControl): Promise<boolean> {
  const space = (await control.findAll<Space>(core.class.Space, { _id: spaceId }))[0]

  if (!space?.private) {
    return true
  }

  return space.members.includes(user._id)
}

async function getCollaboratorsTxes (
  reference: Data<ActivityReference>,
  control: TriggerControl,
  receiver: Account
): Promise<TxMixin<Doc, Doc> | undefined> {
  const { hierarchy } = control

  if (reference.attachedDocClass === undefined || reference.attachedDocId === undefined) {
    return undefined
  }

  if (!hierarchy.isDerived(reference.attachedDocClass, activity.class.ActivityMessage)) {
    return undefined
  }

  const message = (
    await control.findAll<ActivityMessage>(
      reference.attachedDocClass,
      {
        _id: reference.attachedDocId as Ref<ActivityMessage>
      },
      { limit: 1 }
    )
  )[0]

  if (message === undefined) {
    return undefined
  }

  return getPushCollaboratorTx(control, receiver._id, message)
}

async function isReferenceAlreadyNotified (
  reference: Data<ActivityReference>,
  receiver: Ref<Account>,
  control: TriggerControl
): Promise<boolean> {
  const { hierarchy } = control

  if (reference.attachedDocClass === undefined || reference.attachedDocId === undefined) {
    return false
  }

  if (!hierarchy.isDerived(reference.attachedDocClass, activity.class.ActivityMessage)) {
    return false
  }

  return await isMessageAlreadyNotified(reference.attachedDocId as Ref<ActivityMessage>, receiver, control)
}

function isMarkupType (type: Ref<Class<Type<any>>>): boolean {
  return type === core.class.TypeMarkup || type === core.class.TypeCollaborativeMarkup
}

function isCollaborativeType (type: Ref<Class<Type<any>>>): boolean {
  return type === core.class.TypeCollaborativeDoc
}

async function getCreateReferencesTxes (
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
      const content = (createdDoc as any)[attr.name]?.toString() ?? ''
      const attrReferences = getReferencesData(srcDocId, srcDocClass, attachedDocId, attachedDocClass, content)

      refs.push(...attrReferences)
    } else if (attr.type._class === core.class.TypeCollaborativeDoc) {
      const collaborativeDoc = (createdDoc as any)[attr.name] as CollaborativeDoc
      try {
        const ydoc = await loadCollaborativeDoc(storage, control.workspace, collaborativeDoc, control.ctx)
        if (ydoc !== undefined) {
          const attrReferences = getReferencesData(
            srcDocId,
            srcDocClass,
            attachedDocId,
            attachedDocClass,
            yDocToBuffer(ydoc)
          )
          refs.push(...attrReferences)
        }
      } catch {
        // do nothing, the collaborative doc does not sem to exist yet
      }
    }
  }

  const refSpace: Ref<Space> = control.hierarchy.isDerived(srcDocClass, core.class.Space)
    ? (srcDocId as Ref<Space>)
    : srcDocSpace

  return await getReferencesTxes(control, txFactory, refs, refSpace, [], originTx)
}

async function getUpdateReferencesTxes (
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
      const content = (updatedDoc as any)[attr.name]?.toString() ?? ''
      const attrReferences = getReferencesData(srcDocId, srcDocClass, attachedDocId, attachedDocClass, content)
      references.push(...attrReferences)
    } else if (attr.type._class === core.class.TypeCollaborativeDoc) {
      hasReferenceAttrs = true
      try {
        const collaborativeDoc = (updatedDoc as any)[attr.name] as CollaborativeDoc
        const ydoc = await loadCollaborativeDoc(storage, control.workspace, collaborativeDoc, control.ctx)
        if (ydoc !== undefined) {
          const attrReferences = getReferencesData(
            srcDocId,
            srcDocClass,
            attachedDocId,
            attachedDocClass,
            yDocToBuffer(ydoc)
          )
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
    const current = await control.findAll(activity.class.ActivityReference, {
      srcDocId,
      srcDocClass,
      attachedDocId,
      collection: 'references'
    })

    const refSpace: Ref<Space> = control.hierarchy.isDerived(srcDocClass, core.class.Space)
      ? (srcDocId as Ref<Space>)
      : srcDocSpace

    return await getReferencesTxes(control, txFactory, references, refSpace, current, originTx)
  }

  return []
}

export function getReferencesData (
  srcDocId: Ref<Doc>,
  srcDocClass: Ref<Class<Doc>>,
  attachedDocId: Ref<Doc> | undefined,
  attachedDocClass: Ref<Class<Doc>> | undefined,
  content: string | Buffer
): Array<Data<ActivityReference>> {
  const result: Array<Data<ActivityReference>> = []
  const references = []

  if (content instanceof Buffer) {
    const nodes = yDocContentToNodes(content)
    for (const node of nodes) {
      references.push(...extractReferences(node))
    }
  } else {
    const doc = markupToPmNode(content)
    references.push(...extractReferences(doc))
  }

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
  control: TriggerControl,
  txFactory: TxFactory,
  ref: Data<ActivityReference>,
  space: Ref<Space>,
  originTx: TxCUD<Doc>
): Promise<Tx[]> {
  if (control.hierarchy.isDerived(ref.attachedToClass, contact.class.Person)) {
    return await getPersonNotificationTxes(ref, control, txFactory.account, space, originTx)
  }

  const refTx = control.txFactory.createTxCreateDoc(activity.class.ActivityReference, space, ref)
  const tx = control.txFactory.createTxCollectionCUD(ref.attachedToClass, ref.attachedTo, space, ref.collection, refTx)

  return [tx]
}

async function getReferencesTxes (
  control: TriggerControl,
  txFactory: TxFactory,
  references: Data<ActivityReference>[],
  space: Ref<Space>,
  current: ActivityReference[],
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

  // Add missing references
  for (const ref of references) {
    txes.push(...(await createReferenceTxes(control, txFactory, ref, space, originTx)))
  }

  return txes
}

async function getRemoveActivityReferenceTxes (
  control: TriggerControl,
  txFactory: TxFactory,
  removedDocId: Ref<Doc>
): Promise<Tx[]> {
  const txes: Tx[] = []
  const refs = await control.findAll(activity.class.ActivityReference, {
    attachedDocId: removedDocId,
    collection: 'references'
  })

  for (const ref of refs) {
    const removeTx = txFactory.createTxRemoveDoc(ref._class, ref.space, ref._id)
    txes.push(txFactory.createTxCollectionCUD(ref.attachedToClass, ref.attachedTo, ref.space, ref.collection, removeTx))
  }

  return txes
}

function guessReferenceTx (hierarchy: Hierarchy, tx: TxCUD<Doc>): TxCUD<Doc> {
  // Try to guess reference target Tx for TxCollectionCUD txes based on collaborators availability
  if (hierarchy.isDerived(tx._class, core.class.TxCollectionCUD)) {
    const cltx = tx as TxCollectionCUD<Doc, AttachedDoc>
    tx = TxProcessor.extractTx(cltx) as TxCUD<Doc>

    if (hierarchy.isDerived(tx.objectClass, activity.class.ActivityMessage)) {
      return cltx
    }

    const mixin = hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)
    return mixin !== undefined ? tx : cltx
  }
  return tx
}

async function ActivityReferenceCreate (tx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const ctx = TxProcessor.extractTx(tx) as TxCreateDoc<Doc>

  if (ctx._class !== core.class.TxCreateDoc) return []
  if (control.hierarchy.isDerived(ctx.objectClass, activity.class.ActivityReference)) return []

  control.storageFx(async (adapter) => {
    const txFactory = new TxFactory(control.txFactory.account)

    const doc = TxProcessor.createDoc2Doc(ctx)
    const targetTx = guessReferenceTx(control.hierarchy, tx)

    const txes: Tx[] = await getCreateReferencesTxes(
      control,
      adapter,
      txFactory,
      doc,
      targetTx.objectId,
      targetTx.objectClass,
      targetTx.objectSpace,
      tx
    )

    if (txes.length !== 0) {
      await control.apply(txes, true)
    }
  })

  return []
}

async function ActivityReferenceUpdate (tx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const ctx = TxProcessor.extractTx(tx) as TxUpdateDoc<Doc>
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

  const rawDoc = (await control.findAll(ctx.objectClass, { _id: ctx.objectId }))[0]

  if (rawDoc === undefined) {
    return []
  }

  control.storageFx(async (adapter) => {
    const txFactory = new TxFactory(control.txFactory.account)
    const doc = TxProcessor.updateDoc2Doc(rawDoc, ctx)
    const targetTx = guessReferenceTx(control.hierarchy, tx)

    const txes: Tx[] = await getUpdateReferencesTxes(
      control,
      adapter,
      txFactory,
      doc,
      targetTx.objectId,
      targetTx.objectClass,
      targetTx.objectSpace,
      tx
    )

    if (txes.length !== 0) {
      await control.apply(txes, true)
    }
  })

  return []
}

async function ActivityReferenceRemove (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ctx = TxProcessor.extractTx(tx) as TxRemoveDoc<Doc>
  const attributes = control.hierarchy.getAllAttributes(ctx.objectClass)

  let hasMarkdown = false

  for (const attr of attributes.values()) {
    if (isMarkupType(attr.type._class)) {
      hasMarkdown = true
      break
    }
  }

  if (hasMarkdown) {
    const txFactory = new TxFactory(control.txFactory.account)

    const txes: Tx[] = await getRemoveActivityReferenceTxes(control, txFactory, ctx.objectId)
    if (txes.length !== 0) {
      await control.apply(txes, true)
    }
  }

  return []
}

/**
 * @public
 */
export async function ReferenceTrigger (tx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []

  const etx = TxProcessor.extractTx(tx) as TxCreateDoc<Doc>
  if (control.hierarchy.isDerived(etx.objectClass, activity.class.ActivityReference)) return []

  if (etx._class === core.class.TxCreateDoc) {
    result.push(...(await ActivityReferenceCreate(tx, control)))
  }
  if (etx._class === core.class.TxUpdateDoc) {
    result.push(...(await ActivityReferenceUpdate(tx, control)))
  }
  if (etx._class === core.class.TxRemoveDoc) {
    result.push(...(await ActivityReferenceRemove(tx, control)))
  }
  return result
}
