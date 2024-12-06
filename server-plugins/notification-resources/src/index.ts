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
import chunter, { ChatMessage } from '@hcengineering/chunter'
import contact, {
  Employee,
  getAvatarProviderId,
  getGravatarUrl,
  Person,
  PersonAccount,
  type AvatarInfo
} from '@hcengineering/contact'
import core, {
  Account,
  AnyAttribute,
  ArrOf,
  AttachedDoc,
  Class,
  Collection,
  concatLink,
  Data,
  Doc,
  DocumentUpdate,
  generateId,
  MeasureContext,
  MixinUpdate,
  RateLimiter,
  Ref,
  RefTo,
  SortingOrder,
  Space,
  Timestamp,
  toIdMap,
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
  BaseNotificationType,
  BrowserNotification,
  ClassCollaborators,
  Collaborators,
  CommonInboxNotification,
  DocNotifyContext,
  InboxNotification,
  MentionInboxNotification,
  notificationId,
  NotificationType,
  PushData,
  PushSubscription
} from '@hcengineering/notification'
import { getMetadata, getResource, translate } from '@hcengineering/platform'
import serverCore, { type TriggerControl } from '@hcengineering/server-core'
import serverNotification, {
  getPersonAccountById,
  NOTIFICATION_BODY_SIZE,
  PUSH_NOTIFICATION_TITLE_SIZE,
  ReceiverInfo,
  SenderInfo
} from '@hcengineering/server-notification'
import serverView from '@hcengineering/server-view'
import { markupToText, stripTags } from '@hcengineering/text'
import { encodeObjectURI } from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'
import webpush, { WebPushError } from 'web-push'

import { Content, ContextsCache, ContextsCacheKey, NotifyParams, NotifyResult } from './types'
import {
  createPullCollaboratorsTx,
  createPushCollaboratorsTx,
  getHTMLPresenter,
  getNotificationContent,
  getNotificationLink,
  getNotificationProviderControl,
  getTextPresenter,
  getUsersInfo,
  isAllowed,
  isMixinTx,
  isShouldNotifyTx,
  isUserEmployeeInFieldValueTypeMatch,
  isUserInFieldValueTypeMatch,
  messageToMarkup,
  replaceAll,
  toReceiverInfo,
  updateNotifyContextsSpace,
  type NotificationProviderControl
} from './utils'

export function getPushCollaboratorTx (
  control: TriggerControl,
  user: Ref<Account>,
  doc: Doc
): TxMixin<Doc, Doc> | undefined {
  const mixin = control.hierarchy.as(doc, notification.mixin.Collaborators)

  if (mixin.collaborators === undefined || !mixin.collaborators.includes(user)) {
    return control.txFactory.createTxMixin(doc._id, doc._class, doc.space, notification.mixin.Collaborators, {
      $push: {
        collaborators: user
      }
    })
  }

  return undefined
}

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

  const notificationTx = await pushInboxNotifications(
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
    true,
    tx
  )

  if (notificationTx !== undefined) {
    const notificationData = TxProcessor.createDoc2Doc(notificationTx)
    const subscriptions = await control.findAll(ctx, notification.class.PushSubscription, { user: receiver._id })
    await applyNotificationProviders(
      notificationData,
      notifyResult,
      attachedTo,
      attachedToClass,
      control,
      res,
      doc,
      receiver,
      sender,
      subscriptions,
      _class
    )
  }

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
  type: Ref<BaseNotificationType>,
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

function getValueCollaborators (value: any, attr: AnyAttribute, control: TriggerControl): Ref<Account>[] {
  const hierarchy = control.hierarchy
  if (attr.type._class === core.class.RefTo) {
    const to = (attr.type as RefTo<Doc>).to
    if (hierarchy.isDerived(to, contact.class.Person)) {
      return (control.modelDb.getAccountByPersonId(value) as PersonAccount[]).map((it) => it._id)
    } else if (hierarchy.isDerived(to, core.class.Account)) {
      const acc = getPersonAccountById(value, control)
      return acc !== undefined ? [acc._id] : []
    }
  } else if (attr.type._class === core.class.ArrOf) {
    const arrOf = (attr.type as ArrOf<RefTo<Doc>>).of
    if (arrOf._class === core.class.RefTo) {
      const to = (arrOf as RefTo<Doc>).to
      if (hierarchy.isDerived(to, contact.class.Person)) {
        const employeeAccounts = control.modelDb.findAllSync(contact.class.PersonAccount, {
          person: { $in: Array.isArray(value) ? value : [value] }
        })
        return employeeAccounts.map((p) => p._id)
      } else if (hierarchy.isDerived(to, core.class.Account)) {
        const employeeAccounts = control.modelDb.findAllSync(contact.class.PersonAccount, {
          _id: { $in: Array.isArray(value) ? value : [value] }
        })
        return employeeAccounts.map((p) => p._id)
      }
    }
  }
  return []
}

function getKeyCollaborators (
  docClass: Ref<Class<Doc>>,
  value: any,
  field: string,
  control: TriggerControl
): Ref<Account>[] | undefined {
  if (value !== undefined && value !== null) {
    const attr = control.hierarchy.findAttribute(docClass, field)
    if (attr !== undefined) {
      return getValueCollaborators(value, attr, control)
    }
  }
}

/**
 * @public
 */
export async function getDocCollaborators (
  ctx: MeasureContext,
  doc: Doc,
  mixin: ClassCollaborators,
  control: TriggerControl
): Promise<Ref<Account>[]> {
  const collaborators = new Set<Ref<Account>>()
  for (const field of mixin.fields) {
    const value = (doc as any)[field]
    const newCollaborators = ctx.withSync('getKeyCollaborators', {}, (ctx) =>
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
  shouldUpdateTimestamp = true,
  tx?: TxCUD<Doc>
): Promise<TxCreateDoc<InboxNotification> | undefined> {
  const context = getDocNotifyContext(control, contexts, objectId, receiver._id)
  let docNotifyContextId: Ref<DocNotifyContext>

  if (context === undefined) {
    docNotifyContextId = await createNotifyContext(
      ctx,
      control,
      objectId,
      objectClass,
      objectSpace,
      receiver,
      sender._id,
      shouldUpdateTimestamp ? modifiedOn : undefined,
      tx
    )
  } else {
    docNotifyContextId = context._id
  }

  const notificationData = {
    user: receiver._id,
    isViewed: false,
    docNotifyContext: docNotifyContextId,
    archived: false,
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

function isReactionMessage (message?: ActivityMessage): boolean {
  return (
    message !== undefined &&
    message._class === activity.class.DocUpdateMessage &&
    (message as DocUpdateMessage).objectClass === activity.class.Reaction
  )
}

export async function createPushFromInbox (
  control: TriggerControl,
  receiver: ReceiverInfo,
  attachedTo: Ref<Doc>,
  attachedToClass: Ref<Class<Doc>>,
  data: Data<InboxNotification>,
  _class: Ref<Class<InboxNotification>>,
  sender: SenderInfo,
  _id: Ref<Doc>,
  subscriptions: PushSubscription[],
  message?: ActivityMessage
): Promise<Tx | undefined> {
  let { title, body } = await getTranslatedNotificationContent(data, _class, control)
  if (title === '' || body === '') {
    return
  }

  title = title.slice(0, PUSH_NOTIFICATION_TITLE_SIZE)

  const senderPerson = sender.person
  const linkProviders = control.modelDb.findAllSync(serverView.mixin.ServerLinkIdProvider, {})
  const provider = linkProviders.find(({ _id }) => _id === attachedToClass)

  let id: string = attachedTo

  if (provider !== undefined) {
    const encodeFn = await getResource(provider.encode)
    const doc = (await control.findAll(control.ctx, attachedToClass, { _id: attachedTo }))[0]

    if (doc === undefined) {
      return
    }

    id = await encodeFn(doc, control)
  }

  const path = [workbenchId, control.workspace.workspaceUrl, notificationId, encodeObjectURI(id, attachedToClass)]
  await createPushNotification(
    control,
    receiver._id as Ref<PersonAccount>,
    title,
    body,
    _id,
    subscriptions,
    senderPerson,
    path
  )
  return control.txFactory.createTxCreateDoc(notification.class.BrowserNotification, receiver.space, {
    user: receiver._id,
    title,
    body,
    senderId: sender._id,
    tag: _id,
    objectId: attachedTo,
    objectClass: attachedToClass,
    messageId: isReactionMessage(message) ? (message?.attachedTo as Ref<ActivityMessage>) : message?._id,
    messageClass: isReactionMessage(message)
      ? (message?.attachedToClass as Ref<Class<ActivityMessage>>)
      : message?._class,
    onClickLocation: {
      path
    }
  })
}

export async function createPushNotification (
  control: TriggerControl,
  target: Ref<PersonAccount>,
  title: string,
  body: string,
  _id: string,
  subscriptions: PushSubscription[],
  senderAvatar?: Data<AvatarInfo>,
  path?: string[]
): Promise<void> {
  const publicKey = getMetadata(notification.metadata.PushPublicKey)
  const privateKey = getMetadata(serverNotification.metadata.PushPrivateKey)
  const subject = getMetadata(serverNotification.metadata.PushSubject) ?? 'mailto:hey@huly.io'
  if (privateKey === undefined || publicKey === undefined) return
  const userSubscriptions = subscriptions.filter((it) => it.user === target)
  const data: PushData = {
    title,
    body
  }
  if (_id !== undefined) {
    data.tag = _id
  }
  const front = control.branding?.front ?? getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const domainPath = `${workbenchId}/${control.workspace.workspaceUrl}`
  data.domain = concatLink(front, domainPath)
  if (path !== undefined) {
    data.url = concatLink(front, path.join('/'))
  }
  if (senderAvatar != null) {
    const provider = getAvatarProviderId(senderAvatar.avatarType)
    if (provider === contact.avatarProvider.Image) {
      if (senderAvatar.avatar != null) {
        const url = await control.storageAdapter.getUrl(control.ctx, control.workspace, senderAvatar.avatar)
        data.icon = url.includes('://') ? url : concatLink(front, url)
      }
    } else if (provider === contact.avatarProvider.Gravatar && senderAvatar.avatarProps?.url !== undefined) {
      data.icon = getGravatarUrl(senderAvatar.avatarProps?.url, 512)
    }
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  const limiter = new RateLimiter(5)

  for (const subscription of userSubscriptions) {
    await limiter.add(async () => {
      await sendPushToSubscription(control, target, subscription, data)
    })
  }
}

const errorMessages = ['expired', 'Unregistered', 'No such subscription']

async function sendPushToSubscription (
  control: TriggerControl,
  targetUser: Ref<Account>,
  subscription: PushSubscription,
  data: PushData
): Promise<void> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(data))
  } catch (err) {
    control.ctx.info('Cannot send push notification to', { user: targetUser, err })
    if (err instanceof WebPushError) {
      if (errorMessages.some((p) => JSON.stringify((err as WebPushError).body).includes(p))) {
        const tx = control.txFactory.createTxRemoveDoc(subscription._class, subscription.space, subscription._id)
        await control.apply(control.ctx, [tx])
      }
    }
  }
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
  shouldUpdateTimestamp: boolean
): Promise<TxCreateDoc<InboxNotification> | undefined> {
  const content = await getNotificationContent(originTx, [receiver.account], sender, object, control)
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
    shouldUpdateTimestamp,
    originTx
  )
}

export async function applyNotificationProviders (
  data: InboxNotification,
  notifyResult: NotifyResult,
  attachedTo: Ref<Doc>,
  attachedToClass: Ref<Class<Doc>>,
  control: TriggerControl,
  res: Tx[],
  object: Doc,
  receiver: ReceiverInfo,
  sender: SenderInfo,
  subscriptions: PushSubscription[],
  _class = notification.class.ActivityInboxNotification,
  message?: ActivityMessage
): Promise<void> {
  const resources = control.modelDb.findAllSync(serverNotification.class.NotificationProviderResources, {})
  for (const [provider, types] of notifyResult.entries()) {
    if (provider === notification.providers.PushNotificationProvider) {
      // const now = Date.now()
      const pushTx = await createPushFromInbox(
        control,
        receiver,
        attachedTo,
        attachedToClass,
        data,
        _class,
        sender,
        data._id,
        subscriptions,
        message
      )
      if (pushTx !== undefined) {
        res.push(pushTx)
      }

      continue
    }

    const resource = resources.find((it) => it.provider === provider)

    if (resource === undefined) continue

    const fn = await getResource(resource.fn)

    const txes = await fn(control, types, object, data, receiver, sender, message)
    if (txes.length > 0) {
      res.push(...txes)
    }
  }
}

async function createNotifyContext (
  ctx: MeasureContext,
  control: TriggerControl,
  objectId: Ref<Doc>,
  objectClass: Ref<Class<Doc>>,
  objectSpace: Ref<Space>,
  receiver: ReceiverInfo,
  sender: Ref<Account>,
  updateTimestamp?: Timestamp,
  tx?: TxCUD<Doc>
): Promise<Ref<DocNotifyContext>> {
  const contextsCache: ContextsCache = control.cache.get(ContextsCacheKey) ?? {
    contexts: new Map<string, Ref<DocNotifyContext>>()
  }
  const cacheKey = `${objectId}_${receiver._id}`
  const cachedId = contextsCache.contexts.get(cacheKey)

  if (cachedId !== undefined) {
    if (control.removedMap.has(cachedId)) {
      contextsCache.contexts.delete(cacheKey)
    } else {
      return cachedId
    }
  }

  const createTx = control.txFactory.createTxCreateDoc(notification.class.DocNotifyContext, receiver.space, {
    user: receiver._id,
    objectId,
    objectClass,
    objectSpace,
    isPinned: false,
    hidden: false,
    tx: tx?._id,
    lastUpdateTimestamp: updateTimestamp,
    lastViewedTimestamp: sender === receiver._id ? updateTimestamp : undefined
  })

  contextsCache.contexts.set(cacheKey, createTx.objectId)
  control.cache.set(ContextsCacheKey, contextsCache)
  await ctx.with('apply', {}, () => control.apply(control.ctx, [createTx]))
  if (receiver.account?.email !== undefined) {
    control.ctx.contextData.broadcast.targets['docNotifyContext' + createTx._id] = (it) => {
      if (it._id === createTx._id) {
        return [receiver.account?.email]
      }
    }
  }
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
  settings: NotificationProviderControl,
  subscriptions: PushSubscription[]
): Promise<Tx[]> {
  if (receiver.account === undefined) {
    return []
  }

  const res: Tx[] = []

  for (const message of activityMessages) {
    const docMessage = message._class === activity.class.DocUpdateMessage ? (message as DocUpdateMessage) : undefined
    const notifyResult = await isShouldNotifyTx(
      control,
      tx,
      object,
      [receiver.account],
      params.isOwn,
      params.isSpace,
      settings,
      docMessage
    )

    if (notifyResult.has(notification.providers.InboxNotificationProvider)) {
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
        params.shouldUpdateTimestamp
      )

      if (notificationTx !== undefined) {
        const notificationData = TxProcessor.createDoc2Doc(notificationTx)

        await applyNotificationProviders(
          notificationData,
          notifyResult,
          message.attachedTo,
          message.attachedToClass,
          control,
          res,
          object,
          receiver,
          sender,
          subscriptions,
          notificationData._class,
          message
        )
      }
    } else {
      const context = getDocNotifyContext(control, docNotifyContexts, message.attachedTo, receiver.account._id)

      if (context === undefined) {
        await createNotifyContext(
          ctx,
          control,
          message.attachedTo,
          message.attachedToClass,
          object.space,
          receiver,
          sender._id,
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
  modifiedBy: Ref<Account>
): Promise<void> {
  if (contexts.length === 0) return
  const res: Tx[] = []

  for (const context of contexts) {
    const account = getPersonAccountById(context.user, control)
    const isViewed =
      context.lastViewedTimestamp !== undefined && (context.lastUpdateTimestamp ?? 0) <= context.lastViewedTimestamp
    const updateTx = control.txFactory.createTxUpdateDoc(context._class, context.space, context._id, {
      hidden: false,
      lastUpdateTimestamp: timestamp,
      ...(isViewed && modifiedBy === context.user
        ? {
            lastViewedTimestamp: timestamp
          }
        : {})
    })

    res.push(updateTx)

    if (account?.email !== undefined) {
      control.ctx.contextData.broadcast.targets['docNotifyContext' + updateTx._id] = (it) => {
        if (it._id === updateTx._id) {
          return [account.email]
        }
      }
    }
  }

  if (res.length > 0) {
    await ctx.with('apply', {}, () => control.apply(ctx, res))
  }
}

async function removeContexts (
  ctx: MeasureContext,
  contexts: DocNotifyContext[],
  unsubscribe: Ref<PersonAccount>[],
  control: TriggerControl
): Promise<void> {
  if (contexts.length === 0) return
  if (unsubscribe.length === 0) return

  const res: Tx[] = []

  for (const context of contexts) {
    if (!unsubscribe.includes(context.user as Ref<PersonAccount>)) {
      continue
    }
    const account = control.modelDb.getObject(context.user)
    if (account === undefined) continue

    const removeTx = control.txFactory.createTxRemoveDoc(context._class, context.space, context._id)

    res.push(removeTx)

    if (account.email !== undefined) {
      control.ctx.contextData.broadcast.targets['docNotifyContext' + removeTx._id] = (it) => {
        if (it._id === removeTx._id) {
          return [account.email]
        }
      }
    }
  }

  await control.apply(control.ctx, res)
}

export async function createCollabDocInfo (
  ctx: MeasureContext,
  collaborators: Ref<PersonAccount>[],
  control: TriggerControl,
  tx: TxCUD<Doc>,
  object: Doc,
  activityMessages: ActivityMessage[],
  params: NotifyParams,
  unsubscribe: Ref<PersonAccount>[] = []
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

  const targets = new Set(collaborators)

  // user is not collaborator of himself, but we should notify user of changes related to users account (mentions, comments etc)
  if (control.hierarchy.isDerived(object._class, contact.class.Person)) {
    const acc = control.modelDb.getAccountByPersonId(object._id as Ref<Person>) as PersonAccount[]
    for (const a of acc.map((it) => it._id)) {
      targets.add(a)
    }
  }

  if (targets.size === 0) {
    return res
  }

  const usersInfo = await ctx.with('get-user-info', {}, (ctx) =>
    getUsersInfo(ctx, [...Array.from(targets), tx.modifiedBy as Ref<PersonAccount>], control)
  )
  const sender: SenderInfo = usersInfo.get(tx.modifiedBy) ?? {
    _id: tx.modifiedBy
  }

  const settings = await getNotificationProviderControl(ctx, control)
  const subscriptions = (await control.queryFind(ctx, notification.class.PushSubscription, {})).filter((it) =>
    targets.has(it.user as Ref<PersonAccount>)
  )

  for (const target of targets) {
    const info: ReceiverInfo | undefined = toReceiverInfo(control.hierarchy, usersInfo.get(target))

    if (info === undefined) continue

    const targetRes = await getNotificationTxes(
      ctx,
      control,
      object,
      tx,
      info,
      sender,
      params,
      notifyContexts,
      docMessages,
      settings,
      subscriptions
    )
    const ids = new Set(targetRes.map((it) => it._id))
    if (info.account?.email !== undefined) {
      const id = generateId() as string
      control.ctx.contextData.broadcast.targets[id] = (it) => {
        if (ids.has(it._id)) {
          return [info.account?.email]
        }
      }
    }
    res = res.concat(targetRes)
  }
  return res
}

/**
 * @public
 */
export function getMixinTx (
  actualTx: TxCUD<Doc>,
  control: TriggerControl,
  collaborators: Ref<Account>[]
): TxMixin<Doc, Collaborators> {
  return control.txFactory.createTxMixin(
    actualTx.objectId,
    actualTx.objectClass,
    actualTx.objectSpace,
    notification.mixin.Collaborators,
    {
      collaborators
    }
  )
}

async function getTxCollabs (
  ctx: MeasureContext,
  tx: TxCUD<Doc>,
  control: TriggerControl,
  doc: Doc
): Promise<{
    added: Ref<Account>[]
    removed: Ref<Account>[]
    result: Ref<Account>[]
  }> {
  const { hierarchy } = control
  const mixin = hierarchy.classHierarchyMixin<Doc, ClassCollaborators>(
    doc._class,
    notification.mixin.ClassCollaborators
  )
  if (mixin === undefined) return { added: [], removed: [], result: [] }

  if (tx._class === core.class.TxCreateDoc) {
    const collabs = await getDocCollaborators(ctx, doc, mixin, control)
    return { added: collabs, removed: [], result: collabs }
  }

  if (tx._class === core.class.TxRemoveDoc) {
    if (hierarchy.hasMixin(doc, notification.mixin.Collaborators)) {
      return { added: [], removed: [], result: hierarchy.as(doc, notification.mixin.Collaborators).collaborators ?? [] }
    }

    return { added: [], removed: [], result: [] }
  }

  if ([core.class.TxUpdateDoc, core.class.TxMixin].includes(tx._class)) {
    const collabs = new Set(hierarchy.as(doc, notification.mixin.Collaborators).collaborators ?? [])
    const ops = isMixinTx(tx) ? tx.attributes : (tx as TxUpdateDoc<Doc>).operations
    const newCollaborators = getNewCollaborators(ops, mixin, doc._class, control).filter((p) => !collabs.has(p))
    const isSpace = control.hierarchy.isDerived(doc._class, core.class.Space)
    const removedCollabs = isSpace ? getRemovedMembers(ops, mixin, (doc as Space)._class, control) : []
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
  cache: Map<Ref<Doc>, Doc>
): Promise<Tx[]> {
  if (doc.space === core.space.Space) {
    return []
  }

  const space =
    cache.get(doc.space) ?? (await control.findAll(ctx, core.class.Space, { _id: doc.space }, { limit: 1 }))[0]
  if (space === undefined) return []

  cache.set(space._id, space)

  const mixin = control.hierarchy.classHierarchyMixin<Doc, ClassCollaborators>(
    space._class,
    notification.mixin.ClassCollaborators
  )
  if (mixin !== undefined) {
    const collabs = control.hierarchy.as<Doc, Collaborators>(space, notification.mixin.Collaborators)
    if (collabs.collaborators !== undefined) {
      return await createCollabDocInfo(
        ctx,
        collabs.collaborators as Ref<PersonAccount>[],
        control,
        tx,
        doc,
        activityMessages,
        { isSpace: true, isOwn: false, shouldUpdateTimestamp: true }
      )
    }
  }
  return []
}

async function createCollaboratorDoc (
  ctx: MeasureContext,
  tx: TxCreateDoc<Doc>,
  control: TriggerControl,
  activityMessage: ActivityMessage[],
  cache: Map<Ref<Doc>, Doc>
): Promise<Tx[]> {
  const res: Tx[] = []
  const hierarchy = control.hierarchy
  const mixin = hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)

  if (mixin === undefined) {
    return res
  }

  const doc = TxProcessor.createDoc2Doc(tx)
  const collaborators = await ctx.with('get-collaborators', {}, (ctx) => getDocCollaborators(ctx, doc, mixin, control))
  const mixinTx = getMixinTx(tx, control, collaborators)

  const notificationTxes = await ctx.with('create-collabdocinfo', {}, (ctx) =>
    createCollabDocInfo(ctx, collaborators as Ref<PersonAccount>[], control, tx, doc, activityMessage, {
      isOwn: true,
      isSpace: false,
      shouldUpdateTimestamp: true
    })
  )
  res.push(mixinTx)
  res.push(...notificationTxes)

  res.push(
    ...(await ctx.with('get-space-collabtxes', {}, (ctx) =>
      getSpaceCollabTxes(ctx, control, doc, tx, activityMessage, cache)
    ))
  )

  return res
}

async function updateCollaboratorsMixin (
  ctx: MeasureContext,
  tx: TxMixin<Doc, Collaborators>,
  control: TriggerControl,
  activityMessages: ActivityMessage[],
  originTx: TxCUD<Doc>
): Promise<Tx[]> {
  const { hierarchy } = control

  if (tx._class !== core.class.TxMixin) return []
  if (originTx.space === core.space.DerivedTx) return []
  if (!hierarchy.isDerived(tx.mixin, notification.mixin.Collaborators)) return []

  const res: Tx[] = []

  const notificationControl = await getNotificationProviderControl(ctx, control)

  if (tx.attributes.collaborators !== undefined) {
    const createTx = (
      await control.findAll(ctx, core.class.TxCreateDoc, {
        objectId: tx.objectId
      })
    )[0]
    const mixinTxes = await control.findAll(ctx, core.class.TxMixin, {
      objectId: tx.objectId
    })
    const prevDoc = TxProcessor.buildDoc2Doc([createTx, ...mixinTxes].filter((t) => t._id !== tx._id)) as Doc
    const newCollabs: Ref<Account>[] = []

    let prevCollabs: Set<Ref<Account>>

    if (hierarchy.hasMixin(prevDoc, notification.mixin.Collaborators)) {
      const prevDocMixin = control.hierarchy.as(prevDoc, notification.mixin.Collaborators)
      prevCollabs = new Set(prevDocMixin.collaborators ?? [])
    } else {
      const mixin = hierarchy.classHierarchyMixin(prevDoc._class, notification.mixin.ClassCollaborators)
      prevCollabs = mixin !== undefined ? new Set(await getDocCollaborators(ctx, prevDoc, mixin, control)) : new Set()
    }

    const type = await control.modelDb.findOne(notification.class.BaseNotificationType, {
      _id: notification.ids.CollaboratoAddNotification
    })

    if (type === undefined) {
      return res
    }

    const providers = await control.modelDb.findAll(notification.class.NotificationProvider, {})

    for (const collab of tx.attributes.collaborators) {
      if (!prevCollabs.has(collab) && tx.modifiedBy !== collab) {
        for (const provider of providers) {
          if (isAllowed(control, collab as Ref<PersonAccount>, type, provider, notificationControl)) {
            newCollabs.push(collab)
            break
          }
        }
      }
    }

    if (newCollabs.length > 0) {
      const docNotifyContexts = await control.findAll(ctx, notification.class.DocNotifyContext, {
        user: { $in: newCollabs },
        objectId: tx.objectId
      })

      const infos = await ctx.with('get-user-info', {}, (ctx) =>
        getUsersInfo(ctx, [...newCollabs, originTx.modifiedBy] as Ref<PersonAccount>[], control)
      )
      const sender: SenderInfo = infos.get(originTx.modifiedBy) ?? { _id: originTx.modifiedBy }

      for (const collab of newCollabs) {
        const target = toReceiverInfo(hierarchy, infos.get(collab))
        if (target === undefined) continue

        for (const message of activityMessages) {
          await pushActivityInboxNotifications(
            ctx,
            originTx,
            control,
            res,
            target,
            sender,
            prevDoc,
            docNotifyContexts,
            message,
            true
          )
        }
      }
    }
  }
  return res
}

async function collectionCollabDoc (
  ctx: MeasureContext,
  tx: TxCUD<AttachedDoc>,
  control: TriggerControl,
  activityMessages: ActivityMessage[],
  cache: Map<Ref<Doc>, Doc>,
  ignoreCollection: boolean = false
): Promise<Tx[]> {
  let res = await createCollaboratorNotifications(ctx, tx, control, activityMessages, tx, cache, ignoreCollection)

  if (![core.class.TxCreateDoc, core.class.TxRemoveDoc, core.class.TxUpdateDoc].includes(tx._class)) {
    return res
  }

  const { attachedTo, attachedToClass } = tx

  if (attachedTo === undefined || attachedToClass === undefined) {
    return res
  }

  const mixin = control.hierarchy.classHierarchyMixin(attachedToClass, notification.mixin.ClassCollaborators)

  if (mixin === undefined) {
    return res
  }

  const doc = await ctx.with(
    'get-doc',
    {},
    async (ctx) =>
      cache.get(attachedTo) ?? (await control.findAll(ctx, attachedToClass, { _id: attachedTo }, { limit: 1 }))[0]
  )

  if (doc === undefined) {
    return res
  }

  cache.set(doc._id, doc)

  const collaborators = await ctx.with('get-collaborators', {}, (ctx) => getCollaborators(ctx, doc, control, tx, res))

  res = res.concat(
    await ctx.with('create-collab-doc-info', {}, (ctx) =>
      createCollabDocInfo(ctx, collaborators as Ref<PersonAccount>[], control, tx, doc, activityMessages, {
        isOwn: false,
        isSpace: false,
        shouldUpdateTimestamp: true
      })
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
  const hierarchy = control.hierarchy
  const mixin = hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)

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

function getNewCollaborators (
  ops: DocumentUpdate<Doc> | MixinUpdate<Doc, Doc>,
  mixin: ClassCollaborators,
  docClass: Ref<Class<Doc>>,
  control: TriggerControl
): Ref<Account>[] {
  const newCollaborators = new Set<Ref<Account>>()
  if (ops.$push !== undefined) {
    for (const key in ops.$push) {
      if (mixin.fields.includes(key)) {
        let value = (ops.$push as any)[key]
        if (typeof value !== 'string') {
          value = value.$each
        }
        const newCollabs = getKeyCollaborators(docClass, value, key, control)
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
    if (mixin.fields.includes(key)) {
      const value = (ops as any)[key]
      const newCollabs = getKeyCollaborators(docClass, value, key, control)
      if (newCollabs !== undefined) {
        for (const newCollab of newCollabs) {
          newCollaborators.add(newCollab)
        }
      }
    }
  }
  return Array.from(newCollaborators.values())
}

function getRemovedMembers (
  ops: DocumentUpdate<Space> | MixinUpdate<Space, Space>,
  mixin: ClassCollaborators,
  docClass: Ref<Class<Space>>,
  control: TriggerControl
): Ref<Account>[] {
  const removedCollaborators: Ref<Account>[] = []
  if (ops.$pull !== undefined && 'members' in ops.$pull) {
    const key = 'members'
    if (mixin.fields.includes(key)) {
      let value = (ops.$pull as any)[key]
      if (typeof value !== 'string') {
        value = value.$in
      }
      const collabs = getKeyCollaborators(docClass, value, key, control)
      if (collabs !== undefined) {
        removedCollaborators.push(...collabs)
      }
    }
  }

  return Array.from(new Set(removedCollaborators).values())
}

async function updateCollaboratorDoc (
  ctx: MeasureContext,
  tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>,
  control: TriggerControl,
  originTx: TxCUD<Doc>,
  activityMessages: ActivityMessage[],
  cache: Map<Ref<Doc>, Doc>
): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  let res: Tx[] = []
  const mixin = hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)
  if (mixin === undefined) return []
  const doc = await ctx.with(
    'find-doc',
    { _class: tx.objectClass },
    async (ctx) =>
      cache.get(tx.objectId) ?? (await control.findAll(ctx, tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]
  )
  if (doc === undefined) return []
  cache.set(doc._id, doc)
  const params: NotifyParams = { isOwn: true, isSpace: false, shouldUpdateTimestamp: true }
  if (hierarchy.hasMixin(doc, notification.mixin.Collaborators)) {
    // we should handle change field and subscribe new collaborators
    const collabsInfo = await ctx.with('get-tx-collaborators', {}, (ctx) => getTxCollabs(ctx, tx, control, doc))

    if (collabsInfo.added.length > 0) {
      res.push(createPushCollaboratorsTx(control, tx.objectId, tx.objectClass, tx.objectSpace, collabsInfo.added))
    }

    if (collabsInfo.removed.length > 0) {
      res.push(createPullCollaboratorsTx(control, tx.objectId, tx.objectClass, tx.objectSpace, collabsInfo.removed))
    }

    res = res.concat(
      await ctx.with('create-collab-docinfo', {}, (ctx) =>
        createCollabDocInfo(
          ctx,
          collabsInfo.result as Ref<PersonAccount>[],
          control,
          tx,
          doc,
          activityMessages,
          params,
          collabsInfo.removed as Ref<PersonAccount>[]
        )
      )
    )
  } else {
    const collaborators = await ctx.with('get-doc-collaborators', {}, (ctx) =>
      getDocCollaborators(ctx, doc, mixin, control)
    )
    res.push(getMixinTx(tx, control, collaborators))
    res = res.concat(
      await createCollabDocInfo(ctx, collaborators as Ref<PersonAccount>[], control, tx, doc, activityMessages, params)
    )
  }

  res = res.concat(
    await ctx.with('get-space-collabtxes', {}, (ctx) =>
      getSpaceCollabTxes(ctx, control, doc, tx, activityMessages, cache)
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
        htmlTemplate: '<p>{body}</p>',
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

async function applyUserTxes (
  ctx: MeasureContext,
  control: TriggerControl,
  txes: Tx[],
  cache: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>()
): Promise<Tx[]> {
  const map: Map<Ref<Account>, Tx[]> = new Map<Ref<Account>, Tx[]>()
  const res: Tx[] = []

  for (const tx of txes) {
    const ttx = tx as TxCUD<Doc>
    if (
      control.hierarchy.isDerived(ttx.objectClass, notification.class.InboxNotification) &&
      ttx._class === core.class.TxCreateDoc
    ) {
      const notification = TxProcessor.createDoc2Doc(ttx as TxCreateDoc<InboxNotification>)

      if (map.has(notification.user)) {
        map.get(notification.user)?.push(tx)
      } else {
        map.set(notification.user, [tx])
      }
    } else if (
      control.hierarchy.isDerived(ttx.objectClass, notification.class.BrowserNotification) &&
      ttx._class === core.class.TxCreateDoc
    ) {
      const notification = TxProcessor.createDoc2Doc(ttx as TxCreateDoc<BrowserNotification>)

      if (map.has(notification.user)) {
        map.get(notification.user)?.push(tx)
      } else {
        map.set(notification.user, [tx])
      }
    } else {
      res.push(tx)
    }
  }

  for (const [user, txs] of map.entries()) {
    const account =
      (cache.get(user) as PersonAccount) ??
      ctx.withSync('get-person-account', {}, () => getPersonAccountById(user, control))

    if (account !== undefined) {
      cache.set(account._id, account)
      await control.apply(ctx, txs)

      const m1 = toIdMap(txs)
      control.ctx.contextData.broadcast.targets.docNotifyContext = (it) => {
        if (m1.has(it._id)) {
          return [account.email]
        }
      }
    }
  }

  return res
}

async function updateCollaborators (
  ctx: MeasureContext,
  control: TriggerControl,
  tx: TxCUD<Doc>,
  cache: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>()
): Promise<Tx[]> {
  if (tx._class !== core.class.TxUpdateDoc && tx._class !== core.class.TxMixin) return []

  const hierarchy = control.hierarchy

  const mixin = hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)
  if (mixin === undefined) return []

  const { objectClass, objectId, objectSpace } = tx
  const ops = isMixinTx(tx) ? tx.attributes : (tx as TxUpdateDoc<Doc>).operations
  const addedCollaborators = getNewCollaborators(ops, mixin, objectClass, control)
  const isSpace = control.hierarchy.isDerived(objectClass, core.class.Space)
  const removedCollaborators = isSpace ? getRemovedMembers(ops, mixin, objectClass as Ref<Class<Space>>, control) : []

  if (removedCollaborators.length === 0 && addedCollaborators.length === 0) return []

  const doc =
    cache.get(objectId) ?? (await control.findAll(control.ctx, objectClass, { _id: objectId }, { limit: 1 }))[0]
  cache.set(objectId, doc)
  if (doc === undefined) return []

  const res: Tx[] = []
  const currentCollaborators = new Set(hierarchy.as(doc, notification.mixin.Collaborators).collaborators ?? [])
  const toAdd = addedCollaborators.filter((p) => !currentCollaborators.has(p))

  if (toAdd.length === 0 && removedCollaborators.length === 0) return []

  if (toAdd.length > 0) {
    res.push(createPushCollaboratorsTx(control, objectId, objectClass, objectSpace, toAdd))
  }

  if (removedCollaborators.length > 0) {
    res.push(createPullCollaboratorsTx(control, objectId, objectClass, objectSpace, removedCollaborators))
  }

  if (hierarchy.classHierarchyMixin(objectClass, activity.mixin.ActivityDoc) === undefined) return res

  const contexts = await control.findAll(control.ctx, notification.class.DocNotifyContext, { objectId })
  const addedInfo = await getUsersInfo(ctx, toAdd as Ref<PersonAccount>[], control)

  for (const addedUser of addedInfo.values()) {
    const info = toReceiverInfo(hierarchy, addedUser)
    if (info === undefined) continue
    const context = getDocNotifyContext(control, contexts, objectId, info._id)
    if (context !== undefined) {
      if (context.hidden) {
        res.push(control.txFactory.createTxUpdateDoc(context._class, context.space, context._id, { hidden: false }))
      }
    }
    await createNotifyContext(ctx, control, objectId, objectClass, objectSpace, info, tx.modifiedBy, undefined, tx)
  }

  await removeContexts(ctx, contexts, removedCollaborators as Ref<PersonAccount>[], control)

  return res
}

export async function createCollaboratorNotifications (
  ctx: MeasureContext,
  tx: TxCUD<Doc>,
  control: TriggerControl,
  activityMessages: ActivityMessage[],
  originTx?: TxCUD<Doc>,
  cache: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>(),
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
    const res = await ctx.with('collectionCollabDoc', {}, (ctx) =>
      collectionCollabDoc(ctx, tx as TxCUD<AttachedDoc>, control, activityMessages, cache, true)
    )
    return await applyUserTxes(ctx, control, res)
  }

  switch (tx._class) {
    case core.class.TxCreateDoc: {
      const res = await ctx.with('createCollaboratorDoc', {}, (ctx) =>
        createCollaboratorDoc(ctx, tx as TxCreateDoc<Doc>, control, activityMessages, cache)
      )

      return await applyUserTxes(ctx, control, res)
    }
    case core.class.TxUpdateDoc:
    case core.class.TxMixin: {
      let res = await ctx.with('updateCollaboratorDoc', {}, (ctx) =>
        updateCollaboratorDoc(ctx, tx as TxUpdateDoc<Doc>, control, originTx ?? tx, activityMessages, cache)
      )
      res = res.concat(
        await ctx.with('updateCollaboratorMixin', {}, (ctx) =>
          updateCollaboratorsMixin(ctx, tx as TxMixin<Doc, Collaborators>, control, activityMessages, originTx ?? tx)
        )
      )
      return await applyUserTxes(ctx, control, res)
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
): Promise<Ref<Account>[]> {
  const mixin = control.hierarchy.classHierarchyMixin(doc._class, notification.mixin.ClassCollaborators)

  if (mixin === undefined) {
    return []
  }

  if (control.hierarchy.hasMixin(doc, notification.mixin.Collaborators)) {
    return control.hierarchy.as(doc, notification.mixin.Collaborators).collaborators
  } else {
    const collaborators = await getDocCollaborators(ctx, doc, mixin, control)

    res.push(getMixinTx(tx, control, collaborators))
    return collaborators
  }
}

function getDocNotifyContext (
  control: TriggerControl,
  contexts: DocNotifyContext[],
  objectId: Ref<Doc>,
  user: Ref<Account>
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
    const ctx = tx as TxMixin<Person, Employee>
    if (core.class.TxMixin !== ctx._class) {
      continue
    }
    if (ctx.mixin !== contact.mixin.Employee || ctx.attributes.active !== false) {
      continue
    }

    const targetAccount = control.modelDb.getAccountByPersonId(ctx.objectId) as PersonAccount[]
    if (targetAccount.length === 0) {
      continue
    }

    for (const acc of targetAccount) {
      const subscriptions = await control.findAll(control.ctx, notification.class.PushSubscription, {
        user: acc._id
      })
      for (const sub of subscriptions) {
        result.push(control.txFactory.createTxRemoveDoc(sub._class, sub.space, sub._id))
      }
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

export * from './types'
export * from './utils'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnAttributeCreate,
    OnAttributeUpdate,
    OnDocRemove,
    OnEmployeeDeactivate
  },
  function: {
    IsUserInFieldValueTypeMatch: isUserInFieldValueTypeMatch,
    IsUserEmployeeInFieldValueTypeMatch: isUserEmployeeInFieldValueTypeMatch
  }
})
