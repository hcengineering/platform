//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import activity, { ActivityMessage, DocUpdateMessage } from '@hcengineering/activity'
import { Analytics } from '@hcengineering/analytics'
import chunter, { ChatMessage } from '@hcengineering/chunter'
import contact, { Employee, type Person } from '@hcengineering/contact'
import core, {
  AccountUuid,
  AnyAttribute,
  ArrOf,
  AttachedDoc,
  Class,
  ClassCollaborators,
  Collaborator,
  Collection,
  combineAttributes,
  Data,
  Doc,
  DocumentUpdate,
  MeasureContext,
  MixinUpdate,
  notEmpty,
  PersonId,
  readOnlyGuestAccountUuid,
  Ref,
  RefTo,
  SortingOrder,
  Space,
  Timestamp,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import notification, {
  ActivityInboxNotification,
  CommonInboxNotification,
  DocNotifyContext,
  getClassCollaborators,
  InboxNotification,
  MentionInboxNotification,
  NotificationType
} from '@hcengineering/notification'
import { getResource, translate } from '@hcengineering/platform'
import { getAccountBySocialId, getEmployeesBySocialIds } from '@hcengineering/server-contact'
import { type TriggerControl } from '@hcengineering/server-core'
import { NOTIFICATION_BODY_SIZE, ReceiverInfo, SenderInfo } from '@hcengineering/server-notification'
import { markupToText, stripTags } from '@hcengineering/text-core'

import { PushNotificationsHandler } from './push'
import {
  AvailableProvidersCache,
  AvailableProvidersCacheKey,
  Content,
  ContextsCache,
  ContextsCacheKey,
  NotifyParams,
  NotifyResult
} from './types'
import {
  getHTMLPresenter,
  getNotificationContent,
  getNotificationLink,
  getNotificationProviderControl,
  getObjectSpace,
  getReceiversInfo,
  getSenderInfo,
  getTextPresenter,
  isMixinTx,
  isShouldNotifyTx,
  isUserEmployeeInFieldValueTypeMatch,
  mentionTypeMatch,
  messageToMarkup,
  type NotificationProviderControl,
  replaceAll,
  updateNotifyContextsSpace
} from './utils'

export async function getCommonNotificationTxes (
  ctx: MeasureContext,
  control: TriggerControl,
  doc: Doc,
  data: Partial<Data<CommonInboxNotification>>,
  receiver: ReceiverInfo,
  sender: SenderInfo,
  attachedTo: Ref<Doc>,
  attachedToClass: Ref<Class<Doc>>,
  space: Ref<Space>,
  modifiedOn: Timestamp,
  notifyResult: NotifyResult,
  _class = notification.class.CommonInboxNotification,
  tx?: TxCUD<Doc>
): Promise<Tx[]> {
  if (notifyResult.size === 0 || !notifyResult.has(notification.providers.InboxNotificationProvider)) {
    return []
  }

  const res: Tx[] = []
  const notifyContexts = await control.findAll(ctx, notification.class.DocNotifyContext, { objectId: attachedTo })

  await pushInboxNotifications(
    ctx,
    control,
    res,
    receiver,
    sender,
    attachedTo,
    attachedToClass,
    space,
    notifyContexts,
    data,
    _class,
    modifiedOn,
    [],
    true,
    tx
  )

  return res
}

async function getTextPart (doc: Doc, control: TriggerControl): Promise<string | undefined> {
  const TextPresenter = getTextPresenter(doc._class, control.hierarchy)

  if (TextPresenter === undefined) return
  return await (
    await getResource(TextPresenter.presenter)
  )(doc, control)
}

async function getHtmlPart (doc: Doc, control: TriggerControl): Promise<string | undefined> {
  const HTMLPresenter = getHTMLPresenter(doc._class, control.hierarchy)
  return HTMLPresenter != null ? await (await getResource(HTMLPresenter.presenter))(doc, control) : undefined
}

function fillTemplate (
  template: string,
  sender: string,
  doc: string,
  data: string,
  params: Record<string, string> = {}
): string {
  let res = replaceAll(template, '{sender}', sender)
  res = replaceAll(res, '{doc}', doc)
  res = replaceAll(res, '{data}', data)

  for (const key in params) {
    res = replaceAll(res, `{${key}}`, params[key])
  }
  return res
}

/**
 * @public
 */
export async function getContentByTemplate (
  doc: Doc | undefined,
  sender: string,
  type: Ref<NotificationType>,
  control: TriggerControl,
  data: string,
  notificationData?: InboxNotification,
  message?: ActivityMessage
): Promise<Content | undefined> {
  if (doc === undefined) return
  const notificationType = control.modelDb.getObject(type)
  if (notificationType.templates === undefined) return

  const textPart = await getTextPart(doc, control)
  if (textPart === undefined) return
  const params: Record<string, string> =
    notificationData !== undefined
      ? await getTranslatedNotificationContent(notificationData, notificationData._class, control)
      : {}

  if (
    notificationData !== undefined &&
    control.hierarchy.isDerived(notificationData._class, notification.class.MentionInboxNotification)
  ) {
    const messageContent = (notificationData as MentionInboxNotification).messageHtml
    const text = messageContent !== undefined ? markupToText(messageContent) : undefined
    params.body = text ?? params.body
    params.message = text ?? params.message
  }

  if (message !== undefined) {
    const markup = await messageToMarkup(control, message)
    params.message = markup !== undefined ? markupToText(markup) : params.message ?? ''
  } else if (params.message === undefined) {
    params.message = params.body ?? ''
  }

  const link = await getNotificationLink(control, doc, message?._id)
  const app = control.branding?.title ?? 'Huly'
  const linkText = await translate(notification.string.ViewIn, { app })

  params.link = `<a href='${link}'>${linkText}</a>`

  const text = fillTemplate(notificationType.templates.textTemplate, sender, textPart, data, params)
  const htmlPart = await getHtmlPart(doc, control)
  const html = fillTemplate(notificationType.templates.htmlTemplate, sender, htmlPart ?? textPart, data, params)
  const subject = fillTemplate(notificationType.templates.subjectTemplate, sender, textPart, data, params)

  if (subject === '') return

  return {
    text,
    html,
    subject
  }
}

async function getValueCollaborators (value: any, attr: AnyAttribute, control: TriggerControl): Promise<AccountUuid[]> {
  const hierarchy = control.hierarchy
  if (attr.type._class === core.class.RefTo) {
    const to = (attr.type as RefTo<Doc>).to

    if (hierarchy.isDerived(to, contact.class.Person)) {
      const employee = await control.findAll(
        control.ctx,
        contact.mixin.Employee,
        {
          _id: value,
          active: true
        },
        { limit: 1 }
      )

      return employee[0]?.personUuid != null ? [employee[0].personUuid] : []
    }
  } else if (attr.type._class === core.class.TypeAccountUuid) {
    return [value]
  } else if (attr.type._class === core.class.TypePersonId) {
    const acc = await getAccountBySocialId(control, value)
    return acc == null ? [] : [acc]
  } else if (attr.type._class === core.class.ArrOf) {
    const arrOf = (attr.type as ArrOf<RefTo<Doc>>).of

    if (arrOf._class === core.class.RefTo) {
      const to = (arrOf as RefTo<Doc>).to
      if (hierarchy.isDerived(to, contact.class.Person)) {
        if (value.length === 0) return []
        if ((value as any[]).every((it) => it === null)) {
          control.ctx.error('Null-values array of person refs when getting value collaborators', { attr, value })
        }

        const employees = await control.findAll(control.ctx, contact.mixin.Employee, {
          _id: { $in: value },
          active: true
        })

        return employees.map((e) => e.personUuid).filter(notEmpty)
      }
    } else if (arrOf._class === core.class.TypeAccountUuid) {
      return Array.isArray(value) ? value : [value]
    } else if (arrOf._class === core.class.TypePersonId) {
      const socialIds = Array.isArray(value) ? value : [value]
      const personsBySocialIds = await getEmployeesBySocialIds(control, socialIds)

      return Object.values(personsBySocialIds)
        .map((p) => p?.personUuid)
        .filter(notEmpty)
    }
  }
  return []
}

async function getKeyCollaborators (
  docClass: Ref<Class<Doc>>,
  value: any,
  field: string,
  control: TriggerControl
): Promise<AccountUuid[] | undefined> {
  if (value !== undefined && value !== null) {
    const attr = control.hierarchy.findAttribute(docClass, field)
    if (attr !== undefined) {
      const val = await getValueCollaborators(value, attr, control)
      return val
    }
  }
}

/**
 * @public
 */
export async function getDocCollaborators (
  ctx: MeasureContext,
  doc: Doc,
  mixin: ClassCollaborators<Doc>,
  control: TriggerControl
): Promise<AccountUuid[]> {
  const collaborators = new Set<AccountUuid>()
  for (const field of mixin.fields) {
    const value = (doc as any)[field]
    const newCollaborators = await ctx.with('getKeyCollaborators', {}, (ctx) =>
      getKeyCollaborators(doc._class, value, field, control)
    )
    if (newCollaborators !== undefined) {
      for (const newCollaborator of newCollaborators) {
        collaborators.add(newCollaborator)
      }
    }
  }
  return Array.from(collaborators.values())
}

export async function pushInboxNotifications (
  ctx: MeasureContext,
  control: TriggerControl,
  res: Tx[],
  receiver: ReceiverInfo,
  sender: SenderInfo,
  objectId: Ref<Doc>,
  objectClass: Ref<Class<Doc>>,
  objectSpace: Ref<Space>,
  contexts: DocNotifyContext[],
  data: Partial<Data<InboxNotification>>,
  _class: Ref<Class<InboxNotification>>,
  modifiedOn: Timestamp,
  types: Ref<NotificationType>[],
  shouldUpdateTimestamp = true,
  tx?: TxCUD<Doc>
): Promise<TxCreateDoc<InboxNotification> | undefined> {
  const context = getDocNotifyContext(control, contexts, objectId, receiver.account)
  let docNotifyContextId: Ref<DocNotifyContext>

  if (context === undefined) {
    docNotifyContextId = await createNotifyContext(
      ctx,
      control,
      objectId,
      objectClass,
      objectSpace,
      receiver,
      sender.socialId,
      shouldUpdateTimestamp ? modifiedOn : undefined,
      tx
    )
  } else {
    docNotifyContextId = context._id
  }

  const notificationData = {
    user: receiver.account,
    isViewed: receiver.role === 'GUEST' && receiver.account === readOnlyGuestAccountUuid,
    docNotifyContext: docNotifyContextId,
    archived: false,
    objectId,
    objectClass,
    types,
    ...data
  }
  const notificationTx = control.txFactory.createTxCreateDoc(_class, receiver.space, notificationData)
  res.push(notificationTx)

  return notificationTx
}

async function activityInboxNotificationToText (
  doc: Data<ActivityInboxNotification>
): Promise<{ title: string, body: string, [key: string]: string }> {
  let title: string = ''
  let body: string = ''

  const params = doc.intlParams ?? {}
  if (doc.intlParamsNotLocalized != null && Object.keys(doc.intlParamsNotLocalized).length > 0) {
    for (const key in doc.intlParamsNotLocalized) {
      const val = doc.intlParamsNotLocalized[key]
      params[key] = await translate(val, params)
    }
  }
  if (doc.title != null) {
    title = await translate(doc.title, params)
  }
  if (doc.body != null) {
    body = await translate(doc.body, params)
  }

  return { ...params, title, body }
}

async function commonInboxNotificationToText (
  doc: Data<CommonInboxNotification>
): Promise<{ title: string, body: string, [key: string]: string }> {
  let title: string = ''
  let body: string = ''

  let params = doc.intlParams ?? {}
  if (doc.props != null) {
    params = { ...params, ...doc.props }
  }
  if (doc.intlParamsNotLocalized != null && Object.keys(doc.intlParamsNotLocalized).length > 0) {
    for (const key in doc.intlParamsNotLocalized) {
      const val = doc.intlParamsNotLocalized[key]
      params[key] = await translate(val, params)
    }
  }
  if (doc.header != null) {
    title = await translate(doc.header, params)
  }
  if (doc.messageHtml != null) {
    body = stripTags(doc.messageHtml, NOTIFICATION_BODY_SIZE)
  }
  if (doc.message != null) {
    body = await translate(doc.message, params)
  }
  return { ...params, title, body }
}

async function mentionInboxNotificationToText (
  doc: Data<MentionInboxNotification>,
  control: TriggerControl
): Promise<{ title: string, body: string, [key: string]: string }> {
  let obj = (await control.findAll(control.ctx, doc.mentionedInClass, { _id: doc.mentionedIn }, { limit: 1 }))[0]
  if (obj !== undefined) {
    if (control.hierarchy.isDerived(obj._class, chunter.class.ChatMessage)) {
      obj = (
        await control.findAll(
          control.ctx,
          (obj as ChatMessage).attachedToClass,
          { _id: (obj as ChatMessage).attachedTo },
          { limit: 1 }
        )
      )[0]
    }
    if (obj !== undefined) {
      const textPresenter = getTextPresenter(obj._class, control.hierarchy)
      if (textPresenter !== undefined) {
        const textPresenterFunc = await getResource(textPresenter.presenter)
        const title = await textPresenterFunc(obj, control)
        doc.intlParams = {
          ...doc.intlParams,
          title
        }
      }
    }
  }
  return await commonInboxNotificationToText(doc)
}

export async function getTranslatedNotificationContent (
  data: Data<InboxNotification>,
  _class: Ref<Class<InboxNotification>>,
  control: TriggerControl
): Promise<{ title: string, body: string, [key: string]: string }> {
  if (control.hierarchy.isDerived(_class, notification.class.ActivityInboxNotification)) {
    return await activityInboxNotificationToText(data as Data<ActivityInboxNotification>)
  } else if (control.hierarchy.isDerived(_class, notification.class.MentionInboxNotification)) {
    return await mentionInboxNotificationToText(data as Data<MentionInboxNotification>, control)
  } else if (control.hierarchy.isDerived(_class, notification.class.CommonInboxNotification)) {
    return await commonInboxNotificationToText(data as Data<CommonInboxNotification>)
  }

  return { title: '', body: '' }
}

/**
 * @public
 */
export async function pushActivityInboxNotifications (
  ctx: MeasureContext,
  originTx: TxCUD<Doc>,
  control: TriggerControl,
  res: Tx[],
  receiver: ReceiverInfo,
  sender: SenderInfo,
  object: Doc,
  docNotifyContexts: DocNotifyContext[],
  activityMessage: ActivityMessage,
  types: Ref<NotificationType>[],
  shouldUpdateTimestamp: boolean
): Promise<TxCreateDoc<InboxNotification> | undefined> {
  const content = await getNotificationContent(originTx, receiver.employee, sender, object, control)
  const data: Partial<Data<ActivityInboxNotification>> = {
    ...content,
    attachedTo: activityMessage._id,
    attachedToClass: activityMessage._class
  }

  return await pushInboxNotifications(
    ctx,
    control,
    res,
    receiver,
    sender,
    activityMessage.attachedTo,
    activityMessage.attachedToClass,
    object.space,
    docNotifyContexts,
    data,
    notification.class.ActivityInboxNotification,
    activityMessage.modifiedOn,
    types,
    shouldUpdateTimestamp,
    originTx
  )
}

async function createNotifyContext (
  ctx: MeasureContext,
  control: TriggerControl,
  objectId: Ref<Doc>,
  objectClass: Ref<Class<Doc>>,
  objectSpace: Ref<Space>,
  receiver: ReceiverInfo,
  sender: PersonId,
  updateTimestamp?: Timestamp,
  tx?: TxCUD<Doc>
): Promise<Ref<DocNotifyContext>> {
  const contextsCache: ContextsCache = control.cache.get(ContextsCacheKey) ?? {
    contexts: new Map<string, Ref<DocNotifyContext>>()
  }
  const cacheKey = `${objectId}_${receiver.account}`
  const cachedId = contextsCache.contexts.get(cacheKey)

  if (cachedId !== undefined) {
    if (control.removedMap.has(cachedId)) {
      contextsCache.contexts.delete(cacheKey)
    } else {
      return cachedId
    }
  }

  const lastViewedTimestamp =
    receiver.role === 'GUEST' && receiver.account === readOnlyGuestAccountUuid
      ? Number.MAX_VALUE
      : receiver.socialIds.some((it) => it === sender)
        ? updateTimestamp
        : undefined

  const createTx = control.txFactory.createTxCreateDoc(notification.class.DocNotifyContext, receiver.space, {
    user: receiver.account,
    objectId,
    objectClass,
    objectSpace,
    isPinned: false,
    hidden: false,
    tx: tx?._id,
    lastUpdateTimestamp: updateTimestamp,
    lastViewedTimestamp
  })

  contextsCache.contexts.set(cacheKey, createTx.objectId)
  control.cache.set(ContextsCacheKey, contextsCache)
  await ctx.with('apply', {}, () => control.apply(control.ctx, [createTx]))
  return createTx.objectId
}

export async function getNotificationTxes (
  ctx: MeasureContext,
  control: TriggerControl,
  object: Doc,
  tx: TxCUD<Doc>,
  receiver: ReceiverInfo,
  sender: SenderInfo,
  params: NotifyParams,
  docNotifyContexts: DocNotifyContext[],
  activityMessages: ActivityMessage[],
  settings: NotificationProviderControl
): Promise<Tx[]> {
  const res: Tx[] = []

  for (const message of activityMessages) {
    const docMessage = message._class === activity.class.DocUpdateMessage ? (message as DocUpdateMessage) : undefined
    const notifyResult = await isShouldNotifyTx(
      control,
      tx,
      object,
      receiver,
      params.isOwn,
      params.isSpace,
      settings,
      docMessage
    )

    if (notifyResult.has(notification.providers.InboxNotificationProvider)) {
      const types = (notifyResult.get(notification.providers.InboxNotificationProvider) ?? []).map((it) => it._id)
      const notificationTx = await pushActivityInboxNotifications(
        ctx,
        tx,
        control,
        res,
        receiver,
        sender,
        object,
        docNotifyContexts,
        message,
        types,
        params.shouldUpdateTimestamp
      )

      if (notificationTx !== undefined) {
        const current: AvailableProvidersCache = control.contextCache.get(AvailableProvidersCacheKey) ?? new Map()
        const providers = Array.from(notifyResult.keys())
        if (providers.length > 0) {
          current.set(notificationTx.objectId, providers)
          control.contextCache.set('AvailableNotificationProviders', current)
        }
      }
    } else {
      const context = getDocNotifyContext(control, docNotifyContexts, message.attachedTo, receiver.account)

      if (context === undefined) {
        await createNotifyContext(
          ctx,
          control,
          message.attachedTo,
          message.attachedToClass,
          object.space,
          receiver,
          sender.socialId,
          params.shouldUpdateTimestamp ? tx.modifiedOn : undefined,
          tx
        )
      }
    }
  }
  return res
}

async function updateContextsTimestamp (
  ctx: MeasureContext,
  contexts: DocNotifyContext[],
  timestamp: Timestamp,
  control: TriggerControl,
  modifiedBy: PersonId
): Promise<void> {
  if (contexts.length === 0) return
  const res: Tx[] = []
  const modifiedByAccount = await getAccountBySocialId(control, modifiedBy)

  for (const context of contexts) {
    const isViewed =
      context.lastViewedTimestamp !== undefined && (context.lastUpdateTimestamp ?? 0) <= context.lastViewedTimestamp
    const updateTx = control.txFactory.createTxUpdateDoc(context._class, context.space, context._id, {
      hidden: false,
      lastUpdateTimestamp: timestamp,
      ...(isViewed && context.user === modifiedByAccount
        ? {
            lastViewedTimestamp: timestamp
          }
        : {})
    })

    res.push(updateTx)
  }

  if (res.length > 0) {
    await ctx.with('apply', {}, () => control.apply(ctx, res))
  }
}

async function removeContexts (
  ctx: MeasureContext,
  contexts: DocNotifyContext[],
  unsubscribe: AccountUuid[],
  control: TriggerControl
): Promise<void> {
  if (contexts.length === 0) return
  if (unsubscribe.length === 0) return

  const res: Tx[] = []

  for (const context of contexts) {
    if (!unsubscribe.includes(context.user)) {
      continue
    }

    const removeTx = control.txFactory.createTxRemoveDoc(context._class, context.space, context._id)

    res.push(removeTx)
  }

  await control.apply(control.ctx, res)
}

export async function createCollabDocInfo (
  ctx: MeasureContext,
  currentRes: Tx[],
  collaborators: AccountUuid[],
  control: TriggerControl,
  tx: TxCUD<Doc>,
  object: Doc,
  activityMessages: ActivityMessage[],
  params: NotifyParams,
  unsubscribe: AccountUuid[] = [],
  cache: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>()
): Promise<Tx[]> {
  let res: Tx[] = []

  if (tx.space === core.space.DerivedTx) {
    return res
  }

  const docMessages = activityMessages.filter((message) => message.attachedTo === object._id)

  if (docMessages.length === 0) {
    if (unsubscribe.length > 0) {
      const notifyContexts = await control.findAll(ctx, notification.class.DocNotifyContext, {
        objectId: object._id,
        user: { $in: unsubscribe }
      })
      await removeContexts(ctx, notifyContexts, unsubscribe, control)
    }

    return res
  }

  let notifyContexts: DocNotifyContext[] = []
  if (!(object._id === tx.objectId && tx._class === core.class.TxCreateDoc)) {
    notifyContexts = await control.findAll(ctx, notification.class.DocNotifyContext, { objectId: object._id })
  }

  if (notifyContexts.length > 0) {
    await updateContextsTimestamp(ctx, notifyContexts, tx.modifiedOn, control, tx.modifiedBy)
  }
  if (notifyContexts.length > 0 && unsubscribe.length > 0) {
    await removeContexts(ctx, notifyContexts, unsubscribe, control)
  }

  const space = await getObjectSpace(control, object, cache)

  if (space === undefined) {
    control.ctx.error('Cannot find space for object', object)
    Analytics.handleError(
      new Error(`Cannot find space ${object.space} for objectId ${object._id}, objectClass ${object._class}`)
    )
    return res
  }

  cache.set(space._id, space)

  const filteredCollaborators = !space.private
    ? collaborators
    : collaborators.filter(
      (it) =>
        space.members.includes(it) ||
          currentRes.some((tx) => {
            if (tx._class === core.class.TxUpdateDoc) {
              const updateTx = tx as TxUpdateDoc<Space>
              if (updateTx.objectId === space._id) {
                const added = combineAttributes([updateTx.operations], 'members', '$push', '$each')
                return added.includes(it)
              }
            }
            return false
          })
    )
  const targets = new Set(filteredCollaborators)

  // user is not collaborator of himself, but we should notify user of changes related to users account (mentions, comments etc)
  if (control.hierarchy.isDerived(object._class, contact.mixin.Employee)) {
    const account = (object as Employee).personUuid

    if (account != null) {
      targets.add(account)
    }
  }

  if (targets.size === 0) {
    return res
  }

  const receivers = await getReceiversInfo(ctx, Array.from(targets), control)
  const sender: SenderInfo = await getSenderInfo(ctx, tx.modifiedBy, control)
  const settings = await getNotificationProviderControl(ctx, control)

  for (const receiver of receivers) {
    const targetRes = await getNotificationTxes(
      ctx,
      control,
      object,
      tx,
      receiver,
      sender,
      params,
      notifyContexts,
      docMessages,
      settings
    )

    res = res.concat(targetRes)
  }
  return res
}

/**
 * @public
 */
export function getAddCollaboratTxes (
  objectId: Ref<Doc>,
  objectClass: Ref<Class<Doc>>,
  objectSpace: Ref<Space>,
  control: TriggerControl,
  collaborators: AccountUuid[]
): TxCreateDoc<Collaborator>[] {
  const res: TxCreateDoc<Collaborator>[] = []
  for (const collaborator of collaborators) {
    const tx = control.txFactory.createTxCreateDoc(core.class.Collaborator, objectSpace, {
      attachedTo: objectId,
      attachedToClass: objectClass,
      collaborator,
      collection: 'collaborators'
    })
    res.push(tx)
  }
  return res
}

async function getTxCollabs (
  ctx: MeasureContext,
  tx: TxCUD<Doc>,
  control: TriggerControl,
  cache: Map<Ref<Doc>, Collaborator[]>,
  doc: Doc
): Promise<{
    added: AccountUuid[]
    removed: AccountUuid[]
    result: AccountUuid[]
  }> {
  const { hierarchy } = control
  const mixin = getClassCollaborators(control.modelDb, hierarchy, doc._class)
  if (mixin === undefined) return { added: [], removed: [], result: [] }

  if (tx._class === core.class.TxCreateDoc) {
    const collabs = await getDocCollaborators(ctx, doc, mixin, control)
    return { added: collabs, removed: [], result: collabs }
  }

  if (tx._class === core.class.TxRemoveDoc) {
    return { added: [], removed: [], result: [] }
  }

  if ([core.class.TxUpdateDoc, core.class.TxMixin].includes(tx._class)) {
    const collaborators =
      cache.get(doc._id) ??
      (await control.findAll(ctx, core.class.Collaborator, {
        attachedTo: doc._id
      }))
    cache.set(doc._id, collaborators)
    const collabs = collaborators.map((c) => c.collaborator)
    const ops = isMixinTx(tx) ? tx.attributes : (tx as TxUpdateDoc<Doc>).operations
    const newCollaborators = (await getNewCollaborators(ops, mixin, doc._class, control)).filter(
      (p) => !collabs.includes(p)
    )
    const isSpace = control.hierarchy.isDerived(doc._class, core.class.Space)
    const removedCollabs = isSpace ? await getRemovedMembers(ops, mixin, (doc as Space)._class, control) : []
    const result = [...collabs, ...newCollaborators].filter((p) => !removedCollabs.includes(p))

    return { added: newCollaborators, removed: removedCollabs, result }
  }

  return { added: [], removed: [], result: [] }
}

async function getSpaceCollabTxes (
  ctx: MeasureContext,
  control: TriggerControl,
  doc: Doc,
  tx: TxCUD<Doc>,
  activityMessages: ActivityMessage[],
  cache: Map<Ref<Doc>, Collaborator[]>,
  docCache: Map<Ref<Doc>, Doc>
): Promise<Tx[]> {
  if (doc.space === core.space.Space) {
    return []
  }

  const space = await getObjectSpace(control, doc, docCache)
  if (space === undefined) return []

  docCache.set(space._id, space)

  const mixin = getClassCollaborators(control.modelDb, control.hierarchy, space._class)
  if (mixin !== undefined) {
    const collaborators =
      cache.get(space._id) ??
      (await control.findAll(ctx, core.class.Collaborator, {
        attachedTo: space._id
      }))
    cache.set(space._id, collaborators)
    const collabs = collaborators.map((c) => c.collaborator)
    return await createCollabDocInfo(
      ctx,
      [],
      collabs,
      control,
      tx,
      doc,
      activityMessages,
      { isSpace: true, isOwn: false, shouldUpdateTimestamp: true },
      [],
      docCache
    )
  }
  return []
}

async function pushCollaboratorsToPublicSpace (
  control: TriggerControl,
  doc: Doc,
  collaborators: AccountUuid[],
  cache: Map<Ref<Doc>, Doc>
): Promise<Tx[]> {
  const space = await getObjectSpace(control, doc, cache)
  if (space === undefined) return []

  cache.set(space._id, space)

  if (control.hierarchy.isDerived(space._class, core.class.SystemSpace)) {
    return []
  }

  if (space.private) {
    return []
  }

  return collaborators
    .filter((it) => !space.members.includes(it))
    .map((it) => control.txFactory.createTxUpdateDoc(space._class, space.space, space._id, { $push: { members: it } }))
}

async function createCollaboratorDoc (
  ctx: MeasureContext,
  tx: TxCreateDoc<Doc>,
  control: TriggerControl,
  activityMessage: ActivityMessage[],
  cache: Map<Ref<Doc>, Collaborator[]>,
  docCache: Map<Ref<Doc>, Doc>
): Promise<Tx[]> {
  const res: Tx[] = []
  const hierarchy = control.hierarchy
  const mixin = getClassCollaborators(control.modelDb, hierarchy, tx.objectClass)
  if (mixin === undefined) {
    return res
  }

  const doc = TxProcessor.createDoc2Doc(tx)
  const collaborators = await ctx.with('get-collaborators', {}, (ctx) => getDocCollaborators(ctx, doc, mixin, control))
  const mixinTx = getAddCollaboratTxes(tx.objectId, tx.objectClass, tx.objectSpace, control, collaborators)

  res.push(...mixinTx)

  res.push(
    ...(await ctx.with('get-space-collabtxes', {}, (ctx) =>
      getSpaceCollabTxes(ctx, control, doc, tx, activityMessage, cache, docCache)
    ))
  )

  res.push(...(await pushCollaboratorsToPublicSpace(control, doc, collaborators, docCache)))

  const notificationTxes = await ctx.with('create-collabdocinfo', {}, (ctx) =>
    createCollabDocInfo(
      ctx,
      res,
      collaborators,
      control,
      tx,
      doc,
      activityMessage,
      {
        isOwn: true,
        isSpace: false,
        shouldUpdateTimestamp: true
      },
      [],
      docCache
    )
  )

  res.push(...notificationTxes)

  return res
}

async function collectionCollabDoc (
  ctx: MeasureContext,
  tx: TxCUD<AttachedDoc>,
  control: TriggerControl,
  activityMessages: ActivityMessage[],
  cache: Map<Ref<Doc>, Collaborator[]>,
  docCache: Map<Ref<Doc>, Doc>,
  ignoreCollection: boolean = false
): Promise<Tx[]> {
  let res = await createCollaboratorNotifications(
    ctx,
    tx,
    control,
    activityMessages,
    tx,
    cache,
    docCache,
    ignoreCollection
  )

  if (![core.class.TxCreateDoc, core.class.TxRemoveDoc, core.class.TxUpdateDoc].includes(tx._class)) {
    return res
  }

  const { attachedTo, attachedToClass } = tx

  if (attachedTo === undefined || attachedToClass === undefined) {
    return res
  }

  const mixin = getClassCollaborators(control.modelDb, control.hierarchy, attachedToClass)

  if (mixin === undefined) {
    return res
  }

  const doc = await ctx.with(
    'get-doc',
    {},
    async (ctx) =>
      docCache.get(attachedTo) ?? (await control.findAll(ctx, attachedToClass, { _id: attachedTo }, { limit: 1 }))[0]
  )

  if (doc === undefined) {
    return res
  }

  docCache.set(doc._id, doc)

  const collaborators = await ctx.with('get-collaborators', {}, (ctx) => getCollaborators(ctx, doc, control, tx, res))

  res = res.concat(
    await ctx.with('create-collab-doc-info', {}, (ctx) =>
      createCollabDocInfo(
        ctx,
        res,
        collaborators,
        control,
        tx,
        doc,
        activityMessages,
        {
          isOwn: false,
          isSpace: false,
          shouldUpdateTimestamp: true
        },
        [],
        docCache
      )
    )
  )

  return res
}

async function removeContextNotifications (
  control: TriggerControl,
  notifyContextRefs: Ref<DocNotifyContext>[]
): Promise<Tx[]> {
  const inboxNotifications = await control.findAll(
    control.ctx,
    notification.class.InboxNotification,
    {
      docNotifyContext: { $in: notifyContextRefs }
    },
    {
      projection: {
        _id: 1,
        _class: 1,
        space: 1
      }
    }
  )

  return inboxNotifications.map((notification) =>
    control.txFactory.createTxRemoveDoc(notification._class, notification.space, notification._id)
  )
}
async function removeCollaboratorDoc (tx: TxRemoveDoc<Doc>, control: TriggerControl): Promise<Tx[]> {
  const mixin = getClassCollaborators(control.modelDb, control.hierarchy, tx.objectClass)

  if (mixin === undefined) {
    return []
  }

  const res: Tx[] = []
  const notifyContexts = await control.findAll(
    control.ctx,
    notification.class.DocNotifyContext,
    { objectId: tx.objectId },
    {
      projection: {
        _id: 1,
        _class: 1,
        space: 1
      }
    }
  )

  if (notifyContexts.length === 0) {
    return []
  }

  const notifyContextRefs = notifyContexts.map(({ _id }) => _id)

  const txes = await removeContextNotifications(control, notifyContextRefs)
  res.push(...txes)
  notifyContexts.forEach((context) => {
    res.push(control.txFactory.createTxRemoveDoc(context._class, context.space, context._id))
  })

  return res
}

async function getNewCollaborators (
  ops: DocumentUpdate<Doc> | MixinUpdate<Doc, Doc>,
  mixin: ClassCollaborators<Doc>,
  docClass: Ref<Class<Doc>>,
  control: TriggerControl
): Promise<AccountUuid[]> {
  const newCollaborators = new Set<AccountUuid>()
  if (ops.$push !== undefined) {
    for (const key in ops.$push) {
      if (mixin.fields.includes(key as any)) {
        let value = (ops.$push as any)[key]
        if (typeof value !== 'string') {
          value = value.$each
        }
        const newCollabs = await getKeyCollaborators(docClass, value, key, control)
        if (newCollabs !== undefined) {
          for (const newCollab of newCollabs) {
            newCollaborators.add(newCollab)
          }
        }
      }
    }
  }
  for (const key in ops) {
    if (key.startsWith('$')) continue
    if (mixin.fields.includes(key as any)) {
      const value = (ops as any)[key]
      const newCollabs = await getKeyCollaborators(docClass, value, key, control)
      if (newCollabs !== undefined) {
        for (const newCollab of newCollabs) {
          newCollaborators.add(newCollab)
        }
      }
    }
  }

  return Array.from(newCollaborators)
}

async function getRemovedMembers (
  ops: DocumentUpdate<Space> | MixinUpdate<Space, Space>,
  mixin: ClassCollaborators<Doc>,
  docClass: Ref<Class<Space>>,
  control: TriggerControl
): Promise<AccountUuid[]> {
  const removedCollaborators: AccountUuid[] = []
  if (ops.$pull !== undefined && 'members' in ops.$pull) {
    const key = 'members'
    if (mixin.fields.includes(key as any)) {
      let value = (ops.$pull as any)[key]
      if (typeof value !== 'string') {
        value = value.$in
      }
      const collabs = await getKeyCollaborators(docClass, value, key, control)
      if (collabs !== undefined) {
        removedCollaborators.push(...collabs)
      }
    }
  }

  return Array.from(new Set(removedCollaborators))
}

async function createSyncCollaboratorsTxes (
  ctx: MeasureContext,
  control: TriggerControl,
  cache: Map<Ref<Doc>, Collaborator[]>,
  objectId: Ref<Doc>,
  objectClass: Ref<Class<Doc>>,
  objectSpace: Ref<Space>,
  added: AccountUuid[],
  removed: AccountUuid[]
): Promise<{ txes: Tx[], toAdd: AccountUuid[] }> {
  const res: Tx[] = []
  let currentCollaborators =
    cache.get(objectId) ??
    (await control.findAll(ctx, core.class.Collaborator, {
      attachedTo: objectId
    }))

  const toAdd = added.filter((p) => currentCollaborators.find((c) => c.collaborator === p) === undefined)

  if (toAdd.length === 0 && removed.length === 0) return { txes: res, toAdd: [] }

  if (toAdd.length > 0) {
    const txes = getAddCollaboratTxes(objectId, objectClass, objectSpace, control, toAdd)
    res.push(...txes)
    txes.forEach((tx) => {
      const collab = TxProcessor.createDoc2Doc(tx)
      currentCollaborators.push(collab)
    })
  }

  if (removed.length > 0) {
    const toRemove: Collaborator[] = []
    const collabs: Collaborator[] = []
    for (const collab of currentCollaborators) {
      if (removed.includes(collab.collaborator)) {
        toRemove.push(collab)
      } else {
        collabs.push(collab)
      }
    }
    for (const removedCollab of toRemove) {
      res.push(control.txFactory.createTxRemoveDoc(core.class.Collaborator, removedCollab.space, removedCollab._id))
    }
    currentCollaborators = collabs
  }

  cache.set(objectId, currentCollaborators)

  return { txes: res, toAdd }
}

async function updateCollaboratorDoc (
  ctx: MeasureContext,
  tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>,
  control: TriggerControl,
  activityMessages: ActivityMessage[],
  cache: Map<Ref<Doc>, Collaborator[]>,
  docCache: Map<Ref<Doc>, Doc>
): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  let res: Tx[] = []
  const mixin = getClassCollaborators(control.modelDb, hierarchy, tx.objectClass)
  if (mixin === undefined) return []
  const doc = await ctx.with(
    'find-doc',
    { _class: tx.objectClass },
    async (ctx) =>
      docCache.get(tx.objectId) ?? (await control.findAll(ctx, tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]
  )
  if (doc === undefined) return []
  docCache.set(doc._id, doc)
  const params: NotifyParams = { isOwn: true, isSpace: false, shouldUpdateTimestamp: true }
  // we should handle change field and subscribe new collaborators
  const collabsInfo = await ctx.with('get-tx-collaborators', {}, (ctx) => getTxCollabs(ctx, tx, control, cache, doc))
  const sync = await createSyncCollaboratorsTxes(
    ctx,
    control,
    cache,
    doc._id,
    doc._class,
    doc.space,
    collabsInfo.added,
    collabsInfo.removed
  )
  res.push(...sync.txes)

  res = res.concat(
    await ctx.with('create-collab-docinfo', {}, (ctx) =>
      createCollabDocInfo(
        ctx,
        res,
        collabsInfo.result,
        control,
        tx,
        doc,
        activityMessages,
        params,
        collabsInfo.removed,
        docCache
      )
    )
  )

  res = res.concat(
    await ctx.with('get-space-collabtxes', {}, (ctx) =>
      getSpaceCollabTxes(ctx, control, doc, tx, activityMessages, cache, docCache)
    )
  )
  res = res.concat(
    await ctx.with('update-notify-context-space', {}, (ctx) => updateNotifyContextsSpace(ctx, control, tx))
  )

  return res
}

/**
 * @public
 */
export async function OnAttributeCreate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const attribute = TxProcessor.createDoc2Doc(tx as TxCreateDoc<AnyAttribute>)
    const group = (
      await control.modelDb.findAll(notification.class.NotificationGroup, { objectClass: attribute.attributeOf })
    )[0]
    if (group === undefined) {
      continue
    }
    const isCollection: boolean = core.class.Collection === attribute.type._class
    const objectClass = !isCollection ? attribute.attributeOf : (attribute.type as Collection<AttachedDoc>).of
    const txClasses = !isCollection
      ? [control.hierarchy.isMixin(attribute.attributeOf) ? core.class.TxMixin : core.class.TxUpdateDoc]
      : [core.class.TxCreateDoc, core.class.TxRemoveDoc]
    const data: Data<NotificationType> = {
      attribute: attribute._id,
      group: group._id,
      field: attribute.name,
      generated: true,
      objectClass,
      txClasses,
      hidden: false,
      defaultEnabled: false,
      templates: {
        textTemplate: '{body}',
        htmlTemplate: '<p>{body}</p><p>{link}</p>',
        subjectTemplate: '{doc} updated'
      },
      label: attribute.label
    }
    if (isCollection) {
      data.attachedToClass = attribute.attributeOf
    }
    const id =
      `${notification.class.NotificationType}_${attribute.attributeOf}_${attribute.name}` as Ref<NotificationType>
    result.push(control.txFactory.createTxCreateDoc(notification.class.NotificationType, core.space.Model, data, id))
  }
  return result
}

/**
 * @public
 */
export async function OnAttributeUpdate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const ctx = tx as TxUpdateDoc<AnyAttribute>
    if (ctx.operations.hidden === undefined) {
      continue
    }
    const type = (
      await control.findAll(control.ctx, notification.class.NotificationType, { attribute: ctx.objectId })
    )[0]
    if (type === undefined) {
      continue
    }
    result.push(
      control.txFactory.createTxUpdateDoc(type._class, type.space, type._id, {
        hidden: ctx.operations.hidden
      })
    )
  }
  return result
}

async function updateCollaborators (
  ctx: MeasureContext,
  control: TriggerControl,
  tx: TxCUD<Doc>,
  cache: Map<Ref<Doc>, Collaborator[]>
): Promise<Tx[]> {
  if (tx._class !== core.class.TxUpdateDoc && tx._class !== core.class.TxMixin) return []

  const hierarchy = control.hierarchy

  if (hierarchy.classHierarchyMixin(tx.objectClass, activity.mixin.ActivityDoc) === undefined) return []

  const mixin = getClassCollaborators(control.modelDb, hierarchy, tx.objectClass)
  if (mixin === undefined) return []

  const doc = (await control.findAll(ctx, tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]
  if (doc === undefined) return []

  const collabsResult = await getTxCollabs(ctx, tx, control, cache, doc)
  if (collabsResult.added.length === 0 && collabsResult.removed.length === 0) return []

  const res: Tx[] = []

  const { txes: collabTxes } = await createSyncCollaboratorsTxes(
    ctx,
    control,
    cache,
    doc._id,
    doc._class,
    doc.space,
    collabsResult.added,
    collabsResult.removed
  )

  res.push(...collabTxes)

  const contexts = await control.findAll(control.ctx, notification.class.DocNotifyContext, { objectId: tx.attachedTo })
  const addedInfo = collabsResult.added.length > 0 ? await getReceiversInfo(ctx, collabsResult.added, control) : []

  for (const info of addedInfo) {
    const context = getDocNotifyContext(control, contexts, doc._id, info.account)
    if (context !== undefined) {
      if (context.hidden) {
        res.push(control.txFactory.createTxUpdateDoc(context._class, context.space, context._id, { hidden: false }))
      }
    }
    await createNotifyContext(ctx, control, doc._id, doc._class, doc.space, info, tx.modifiedBy, undefined, tx)
  }

  if (collabsResult.removed.length > 0) {
    await removeContexts(ctx, contexts, collabsResult.removed, control)
  }

  return res
}

export async function createCollaboratorNotifications (
  ctx: MeasureContext,
  tx: TxCUD<Doc>,
  control: TriggerControl,
  activityMessages: ActivityMessage[],
  originTx?: TxCUD<Doc>,
  cache: Map<Ref<Doc>, Collaborator[]> = new Map<Ref<Doc>, Collaborator[]>(),
  docCache: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>(),
  ignoreCollection: boolean = false
): Promise<Tx[]> {
  if (tx.space === core.space.DerivedTx) {
    // do not forgot update collaborators for derived  tx
    return await ctx.with('updateDerivedCollaborators', {}, (ctx) => updateCollaborators(ctx, control, tx, cache))
  }

  if (activityMessages.length === 0) {
    return []
  }

  if (tx.attachedTo !== undefined && !ignoreCollection) {
    return await ctx.with('collectionCollabDoc', {}, (ctx) =>
      collectionCollabDoc(ctx, tx as TxCUD<AttachedDoc>, control, activityMessages, cache, docCache, true)
    )
  }

  switch (tx._class) {
    case core.class.TxCreateDoc: {
      return await ctx.with('createCollaboratorDoc', {}, (ctx) =>
        createCollaboratorDoc(ctx, tx as TxCreateDoc<Doc>, control, activityMessages, cache, docCache)
      )
    }
    case core.class.TxUpdateDoc:
    case core.class.TxMixin: {
      const res = await ctx.with('updateCollaboratorDoc', {}, (ctx) =>
        updateCollaboratorDoc(ctx, tx as TxUpdateDoc<Doc>, control, activityMessages, cache, docCache)
      )
      return res
    }
  }

  return []
}

/**
 * @public
 */
export async function removeDocInboxNotifications (_id: Ref<ActivityMessage>, control: TriggerControl): Promise<Tx[]> {
  const inboxNotifications = await control.findAll(control.ctx, notification.class.InboxNotification, {
    attachedTo: _id
  })

  return inboxNotifications.map((inboxNotification) =>
    control.txFactory.createTxRemoveDoc(
      notification.class.InboxNotification,
      inboxNotification.space,
      inboxNotification._id
    )
  )
}

export async function getCollaborators (
  ctx: MeasureContext,
  doc: Doc,
  control: TriggerControl,
  tx: TxCUD<Doc>,
  res: Tx[]
): Promise<AccountUuid[]> {
  const mixin = getClassCollaborators(control.modelDb, control.hierarchy, doc._class)

  if (mixin === undefined) {
    return []
  }

  const collaborators = await control.findAll(ctx, core.class.Collaborator, {
    attachedTo: doc._id
  })

  if (collaborators.length > 0) {
    return collaborators.map((p) => p.collaborator)
  } else {
    const collaborators = await getDocCollaborators(ctx, doc, mixin, control)

    res.push(...getAddCollaboratTxes(tx.objectId, tx.objectClass, tx.objectSpace, control, collaborators))
    return collaborators
  }
}

function getDocNotifyContext (
  control: TriggerControl,
  contexts: DocNotifyContext[],
  objectId: Ref<Doc>,
  user: AccountUuid
): DocNotifyContext | undefined {
  const context = contexts.find((it) => it.objectId === objectId && it.user === user)

  if (context !== undefined) {
    return context
  }

  const txes = [...control.txes, ...control.ctx.contextData.broadcast.txes] as TxCUD<Doc>[]

  for (const tx of txes) {
    if (tx._class === core.class.TxCreateDoc && tx.objectClass === notification.class.DocNotifyContext) {
      const doc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<DocNotifyContext>)
      if (doc.objectId === objectId && doc.user === user) {
        return doc
      }
    }
  }
  return undefined
}

async function OnActivityMessageRemove (message: ActivityMessage, control: TriggerControl): Promise<Tx[]> {
  if (control.removedMap.has(message.attachedTo)) {
    return []
  }

  const contexts = await control.findAll(control.ctx, notification.class.DocNotifyContext, {
    objectId: message.attachedTo,
    lastUpdateTimestamp: message.createdOn
  })
  if (contexts.length === 0) return []

  const lastMessage = (
    await control.findAll(
      control.ctx,
      activity.class.ActivityMessage,
      { attachedTo: message.attachedTo, space: message.space },
      { sort: { createdOn: SortingOrder.Descending }, limit: 1 }
    )
  )[0]
  if (lastMessage === undefined) return []

  const res: Tx[] = []

  for (const context of contexts) {
    const tx = control.txFactory.createTxUpdateDoc(context._class, context.space, context._id, {
      lastUpdateTimestamp: lastMessage.createdOn ?? lastMessage.modifiedOn
    })

    res.push(tx)
  }

  return res
}

async function OnEmployeeDeactivate (txes: TxCUD<Doc>[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const actualTx = tx
    if (core.class.TxMixin !== actualTx._class) {
      return []
    }
    const ctx = actualTx as TxMixin<Person, Employee>
    if (ctx.mixin !== contact.mixin.Employee || ctx.attributes.active !== false) {
      return []
    }
    const person = (await control.findAll(control.ctx, contact.class.Person, { _id: ctx.objectId }))[0]
    if (person?.personUuid === undefined) return []

    const res: Tx[] = []
    const subscriptions = await control.findAll(control.ctx, notification.class.PushSubscription, {
      user: person.personUuid as AccountUuid
    })
    for (const sub of subscriptions) {
      res.push(control.txFactory.createTxRemoveDoc(sub._class, sub.space, sub._id))
    }
  }
  return result
}

async function OnDocRemove (txes: TxCUD<Doc>[], control: TriggerControl): Promise<Tx[]> {
  const ltxes = txes.filter((it) => it._class === core.class.TxRemoveDoc) as TxRemoveDoc<Doc>[]
  const res: Tx[] = []
  for (const tx of ltxes) {
    if (control.hierarchy.isDerived(tx.objectClass, activity.class.ActivityMessage)) {
      const message = control.removedMap.get(tx.objectId) as ActivityMessage | undefined

      if (message !== undefined) {
        const txes = await OnActivityMessageRemove(message, control)
        res.push(...txes)
      }
    } else if (control.hierarchy.isDerived(tx.objectClass, notification.class.DocNotifyContext)) {
      const contextsCache: ContextsCache | undefined = control.cache.get(ContextsCacheKey)
      if (contextsCache !== undefined) {
        for (const [key, value] of contextsCache.contexts.entries()) {
          if (value === tx.objectId) {
            contextsCache.contexts.delete(key)
          }
        }
      }

      res.push(...(await removeContextNotifications(control, [tx.objectId as Ref<DocNotifyContext>])))
    }

    res.push(...(await removeCollaboratorDoc(tx, control)))
  }
  return res
}

export * from './push'
export * from './types'
export * from './utils'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnAttributeCreate,
    OnAttributeUpdate,
    OnDocRemove,
    OnEmployeeDeactivate,
    PushNotificationsHandler
  },
  function: {
    IsUserEmployeeInFieldValueTypeMatch: isUserEmployeeInFieldValueTypeMatch,
    MentionTypeMatch: mentionTypeMatch
  }
})
