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

import activity, {
  type ActivityMessage,
  type ActivityMessageControl,
  type DocAttributeUpdates,
  type DocUpdateMessage,
  type Reaction
} from '@hcengineering/activity'
import core, {
  type PersonId,
  type AttachedDoc,
  type Class,
  type Collection,
  type Data,
  type Doc,
  type Hierarchy,
  matchQuery,
  type MeasureContext,
  type Ref,
  type Space,
  type Tx,
  type TxCreateDoc,
  type TxCUD,
  TxProcessor
} from '@hcengineering/core'
import notification, { type NotificationContent } from '@hcengineering/notification'
import { getResource, translate } from '@hcengineering/platform'
import { type ActivityControl, type DocObjectCache } from '@hcengineering/server-activity'
import type { TriggerControl } from '@hcengineering/server-core'
import {
  createCollabDocInfo,
  createCollaboratorNotifications,
  getTextPresenter,
  removeDocInboxNotifications
} from '@hcengineering/server-notification-resources'

import { ReferenceTrigger } from './references'
import { getAttrName, getCollectionAttribute, getDocUpdateAction, getTxAttributesUpdates } from './utils'

export async function OnReactionChanged (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  for (const tx of txes) {
    const innerTx = tx as TxCUD<Reaction>

    if (innerTx._class === core.class.TxCreateDoc) {
      const txes = await createReactionNotifications(innerTx, control)

      await control.apply(control.ctx, txes)
      continue
    }

    if (innerTx._class === core.class.TxRemoveDoc) {
      const txes = await removeReactionNotifications(innerTx, control)
      await control.apply(control.ctx, txes)
      continue
    }
  }

  return []
}

export async function removeReactionNotifications (tx: TxCUD<Reaction>, control: TriggerControl): Promise<Tx[]> {
  if (tx.attachedTo === undefined) return []
  const message = (
    await control.findAll(
      control.ctx,
      activity.class.ActivityMessage,
      { objectId: tx.objectId },
      { projection: { _id: 1, _class: 1, space: 1 } }
    )
  )[0]

  if (message === undefined) {
    return []
  }

  const res: Tx[] = []
  const txes = await removeDocInboxNotifications(message._id, control)

  const removeTx = control.txFactory.createTxRemoveDoc(message._class, message.space, message._id)

  res.push(removeTx)
  res.push(...txes)

  return res
}

export async function createReactionNotifications (tx: TxCUD<Reaction>, control: TriggerControl): Promise<Tx[]> {
  if (tx.attachedTo === undefined) return []
  const parentMessage = (
    await control.findAll(control.ctx, activity.class.ActivityMessage, { _id: tx.attachedTo as Ref<ActivityMessage> })
  )[0]

  if (parentMessage === undefined) {
    return []
  }

  const user = parentMessage.createdBy

  if (user === undefined || user === core.account.System || user === tx.modifiedBy) {
    return []
  }

  let res: Tx[] = []

  const rawMessage: Data<DocUpdateMessage> = {
    txId: tx._id,
    attachedTo: parentMessage._id,
    attachedToClass: parentMessage._class,
    objectId: tx.objectId,
    objectClass: tx.objectClass,
    action: 'create',
    collection: 'docUpdateMessages',
    updateCollection: tx.collection
  }

  const messageTx = getDocUpdateMessageTx(control, tx, parentMessage, rawMessage, tx.modifiedBy)

  if (messageTx === undefined) {
    return []
  }

  res.push(messageTx)

  const docUpdateMessage = TxProcessor.createDoc2Doc(messageTx as TxCreateDoc<DocUpdateMessage>)

  res = res.concat(
    await createCollabDocInfo(control.ctx, res, [user], control, tx, parentMessage, [docUpdateMessage], {
      isOwn: true,
      isSpace: false,
      shouldUpdateTimestamp: false
    })
  )

  return res
}

function isActivityDoc (_class: Ref<Class<Doc>>, hierarchy: Hierarchy): boolean {
  const mixin = hierarchy.classHierarchyMixin(_class, activity.mixin.ActivityDoc)

  return mixin !== undefined
}

function isSpace (space: Doc, hierarchy: Hierarchy): space is Space {
  return hierarchy.isDerived(space._class, core.class.Space)
}

function getDocUpdateMessageTx (
  control: ActivityControl,
  originTx: TxCUD<Doc>,
  object: Doc,
  rawMessage: Data<DocUpdateMessage>,
  modifiedBy?: PersonId
): TxCUD<DocUpdateMessage> {
  const { hierarchy } = control
  const space = isSpace(object, hierarchy) ? object._id : object.space
  const innerTx = control.txFactory.createTxCreateDoc(
    activity.class.DocUpdateMessage,
    space,
    rawMessage,
    undefined,
    originTx.modifiedOn,
    modifiedBy ?? originTx.modifiedBy
  )

  return control.txFactory.createTxCollectionCUD(
    rawMessage.attachedToClass,
    rawMessage.attachedTo,
    space,
    rawMessage.collection,
    innerTx,
    originTx.modifiedOn,
    modifiedBy ?? originTx.modifiedBy
  )
}

export async function pushDocUpdateMessages (
  ctx: MeasureContext,
  control: ActivityControl,
  res: TxCUD<DocUpdateMessage>[],
  object: Doc | undefined,
  originTx: TxCUD<Doc>,
  modifiedBy?: PersonId,
  objectCache?: DocObjectCache,
  controlRules?: ActivityMessageControl[]
): Promise<TxCUD<DocUpdateMessage>[]> {
  if (object === undefined) {
    return res
  }

  if (!isActivityDoc(object._class, control.hierarchy)) {
    return res
  }

  const rawMessage: Data<DocUpdateMessage> = {
    txId: originTx._id,
    attachedTo: object._id,
    attachedToClass: object._class,
    objectId: originTx.objectId,
    objectClass: originTx.objectClass,
    action: getDocUpdateAction(control, originTx),
    collection: 'docUpdateMessages',
    updateCollection: originTx.collection
  }

  const attributesUpdates = await getTxAttributesUpdates(ctx, control, originTx, object, objectCache, controlRules)

  for (const attributeUpdates of attributesUpdates) {
    res.push(
      getDocUpdateMessageTx(
        control,
        originTx,
        object,
        {
          ...rawMessage,
          attributeUpdates
        },
        modifiedBy
      )
    )
  }

  if (attributesUpdates.length === 0 && rawMessage.action !== 'update') {
    res.push(getDocUpdateMessageTx(control, originTx, object, rawMessage, modifiedBy))
  }

  return res
}

export async function generateDocUpdateMessages (
  ctx: MeasureContext,
  tx: TxCUD<Doc>,
  control: ActivityControl,
  res: TxCUD<DocUpdateMessage>[] = [],
  objectCache?: DocObjectCache,
  skipAttached: boolean = false
): Promise<TxCUD<DocUpdateMessage>[]> {
  if (tx.space === core.space.DerivedTx) {
    return res
  }

  const { hierarchy } = control
  if (
    hierarchy.isDerived(tx.objectClass, activity.class.ActivityMessage) ||
    (tx.attachedToClass !== undefined && hierarchy.isDerived(tx.attachedToClass, activity.class.ActivityMessage))
  ) {
    return res
  }

  if (
    hierarchy.classHierarchyMixin(tx.objectClass, activity.mixin.IgnoreActivity) !== undefined ||
    (tx.attachedToClass !== undefined &&
      hierarchy.classHierarchyMixin(tx.attachedToClass, activity.mixin.IgnoreActivity) !== undefined)
  ) {
    return res
  }

  // Check if we have override control over transaction => activity mappings
  const controlRules = control.modelDb.findAllSync<ActivityMessageControl>(activity.class.ActivityMessageControl, {
    objectClass: { $in: hierarchy.getAncestors(tx.objectClass) }
  })
  if (controlRules.length > 0) {
    for (const r of controlRules) {
      for (const s of r.skip) {
        if (matchQuery([tx], s, core.class.TxCUD, hierarchy).length > 0) {
          // Match found, we need to skip
          return res
        }
      }
    }
  }

  if (tx.attachedTo !== undefined && tx.attachedToClass !== undefined && !skipAttached) {
    res = await generateDocUpdateMessages(ctx, tx, control, res, objectCache, true)
    if ([core.class.TxCreateDoc, core.class.TxRemoveDoc].includes(tx._class)) {
      if (!isActivityDoc(tx.attachedToClass, control.hierarchy)) {
        return res
      }

      let doc = objectCache?.docs?.get(tx.attachedTo)
      if (doc === undefined) {
        doc = (await control.findAll(ctx, tx.attachedToClass, { _id: tx.attachedTo }, { limit: 1 }))[0]
      }
      if (doc === undefined) {
        const createTx = (
          await control.findAll(ctx, core.class.TxCreateDoc, { objectId: tx.attachedTo }, { limit: 1 })
        )[0]

        doc = createTx !== undefined ? TxProcessor.createDoc2Doc(createTx as TxCreateDoc<Doc>) : undefined
      }
      if (doc !== undefined) {
        objectCache?.docs?.set(tx.attachedTo, doc)
        return await ctx.with(
          'pushDocUpdateMessages',
          {},
          async (ctx) =>
            await pushDocUpdateMessages(ctx, control, res, doc ?? undefined, tx, undefined, objectCache, controlRules)
        )
      }
    }
    return res
  }

  switch (tx._class) {
    case core.class.TxCreateDoc: {
      const doc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<Doc>)
      return await ctx.with('pushDocUpdateMessages', {}, (ctx) =>
        pushDocUpdateMessages(ctx, control, res, doc, tx, undefined, objectCache, controlRules)
      )
    }
    case core.class.TxMixin:
    case core.class.TxUpdateDoc: {
      if (isActivityDoc(tx.objectClass, control.hierarchy)) {
        let doc = objectCache?.docs?.get(tx.objectId)
        if (doc === undefined) {
          doc = (await control.findAll(ctx, tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]
          objectCache?.docs?.set(tx.objectId, doc)
        }
        return await ctx.with(
          'pushDocUpdateMessages',
          {},
          async (ctx) =>
            await pushDocUpdateMessages(ctx, control, res, doc ?? undefined, tx, undefined, objectCache, controlRules)
        )
      }
    }
  }

  return res
}

async function ActivityMessagesHandler (_txes: TxCUD<Doc>[], control: TriggerControl): Promise<Tx[]> {
  const ltxes = _txes.filter(
    (it) =>
      !(
        control.hierarchy.isDerived(it.objectClass, activity.class.ActivityMessage) ||
        control.hierarchy.isDerived(it.objectClass, notification.class.DocNotifyContext) ||
        control.hierarchy.isDerived(it.objectClass, notification.class.ActivityInboxNotification) ||
        control.hierarchy.isDerived(it.objectClass, notification.class.BrowserNotification)
      )
  )

  const cache: DocObjectCache = control.contextCache.get('ActivityMessagesHandler') ?? {
    docs: new Map(),
    transactions: new Map()
  }
  control.contextCache.set('ActivityMessagesHandler', cache)
  const result: Tx[] = []
  for (const tx of ltxes) {
    const txes =
      tx.space === core.space.DerivedTx
        ? []
        : await control.ctx.with('generateDocUpdateMessages', {}, (ctx) =>
          generateDocUpdateMessages(ctx, tx, control, [], cache)
        )

    const messages = txes.map((messageTx) => TxProcessor.createDoc2Doc(messageTx as TxCreateDoc<DocUpdateMessage>))

    const notificationTxes = await control.ctx.with('createCollaboratorNotifications', {}, (ctx) =>
      createCollaboratorNotifications(ctx, tx, control, messages, undefined, cache.docs as Map<Ref<Doc>, Doc>)
    )

    result.push(...txes, ...notificationTxes)
  }
  if (result.length > 0) {
    await control.apply(control.ctx, result)
  }
  return []
}

async function OnDocRemoved (txes: TxCUD<Doc>[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxRemoveDoc) {
      continue
    }

    const activityDocMixin = control.hierarchy.classHierarchyMixin(tx.objectClass, activity.mixin.ActivityDoc)

    if (activityDocMixin === undefined) {
      continue
    }

    const messages = await control.findAll(
      control.ctx,
      activity.class.ActivityMessage,
      { attachedTo: tx.objectId },
      { projection: { _id: 1, _class: 1, space: 1 } }
    )

    result.push(
      ...messages.map((message) => control.txFactory.createTxRemoveDoc(message._class, message.space, message._id))
    )
  }
  return result
}

async function ReactionNotificationContentProvider (
  doc: ActivityMessage,
  originTx: TxCUD<Doc>,
  _: PersonId,
  control: TriggerControl
): Promise<NotificationContent> {
  const tx = originTx as TxCreateDoc<Reaction>
  const presenter = getTextPresenter(doc._class, control.hierarchy)
  const reaction = TxProcessor.createDoc2Doc(tx)

  let text = ''

  if (presenter !== undefined) {
    const fn = await getResource(presenter.presenter)

    text = await fn(doc, control)
  } else {
    text = await translate(activity.string.Message, {})
  }

  return {
    title: activity.string.ReactionNotificationTitle,
    body: activity.string.ReactionNotificationBody,
    data: reaction.emoji,
    intlParams: {
      title: text,
      reaction: reaction.emoji
    }
  }
}

async function getAttributesUpdatesText (
  attributeUpdates: DocAttributeUpdates,
  objectClass: Ref<Class<Doc>>,
  hierarchy: Hierarchy
): Promise<string | undefined> {
  const attrName = await getAttrName(attributeUpdates, objectClass, hierarchy)

  if (attrName === undefined) {
    return undefined
  }

  if (attributeUpdates.added.length > 0) {
    return await translate(activity.string.NewObject, { object: attrName })
  }
  if (attributeUpdates.removed.length > 0) {
    return await translate(activity.string.RemovedObject, { object: attrName })
  }

  if (attributeUpdates.set.length > 0) {
    const values = attributeUpdates.set
    const isUnset = values.length > 0 && !values.some((value) => value !== null && value !== '')

    if (isUnset) {
      return await translate(activity.string.UnsetObject, { object: attrName })
    } else {
      return await translate(activity.string.ChangedObject, { object: attrName })
    }
  }

  return undefined
}

export async function DocUpdateMessageTextPresenter (doc: DocUpdateMessage, control: TriggerControl): Promise<string> {
  const { hierarchy } = control
  const { attachedTo, attachedToClass, objectClass, objectId, action, updateCollection, attributeUpdates } = doc
  const isOwn = attachedTo === objectId

  const collectionAttribute = getCollectionAttribute(hierarchy, attachedToClass, updateCollection)
  const clazz = hierarchy.getClass(objectClass)
  const objectName = (collectionAttribute?.type as Collection<AttachedDoc>)?.itemLabel ?? clazz.label
  const collectionName = collectionAttribute?.label

  const name =
    isOwn || collectionName === undefined ? await translate(objectName, {}) : await translate(collectionName, {})

  if (action === 'create') {
    return await translate(activity.string.NewObject, { object: name })
  }

  if (action === 'remove') {
    return await translate(activity.string.RemovedObject, { object: name })
  }

  if (action === 'update' && attributeUpdates !== undefined) {
    const text = await getAttributesUpdatesText(attributeUpdates, objectClass, hierarchy)

    if (text !== undefined) {
      return text
    }
  }

  return await translate(activity.string.UpdatedObject, { object: name })
}

export * from './references'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    ReferenceTrigger,
    ActivityMessagesHandler,
    OnDocRemoved,
    OnReactionChanged
  },
  function: {
    ReactionNotificationContentProvider,
    DocUpdateMessageTextPresenter
  }
})
