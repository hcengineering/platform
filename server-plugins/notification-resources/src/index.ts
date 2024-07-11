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
  type AvatarInfo,
  getAvatarProviderId,
  getGravatarUrl,
  Person,
  PersonAccount
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
  MeasureContext,
  MixinUpdate,
  Ref,
  RefTo,
  Space,
  Timestamp,
  toIdMap,
  Tx,
  TxCollectionCUD,
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
  NotificationStatus,
  NotificationType,
  PushData,
  PushSubscription
} from '@hcengineering/notification'
import { getMetadata, getResource, translate } from '@hcengineering/platform'
import type { TriggerControl } from '@hcengineering/server-core'
import serverCore from '@hcengineering/server-core'
import serverNotification, {
  getPersonAccount,
  getPersonAccountById,
  NOTIFICATION_BODY_SIZE,
  UserInfo
} from '@hcengineering/server-notification'
import serverView from '@hcengineering/server-view'
import { stripTags } from '@hcengineering/text'
import { encodeObjectURI } from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'
import webpush, { WebPushError } from 'web-push'

import { Content, NotifyParams, NotifyResult } from './types'
import {
  getHTMLPresenter,
  getNotificationContent,
  getTextPresenter,
  getUsersInfo,
  isAllowed,
  isMixinTx,
  isShouldNotifyTx,
  isUserEmployeeInFieldValue,
  isUserInFieldValue,
  replaceAll,
  updateNotifyContextsSpace
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
  control: TriggerControl,
  doc: Doc,
  data: Partial<Data<CommonInboxNotification>>,
  receiver: UserInfo,
  sender: UserInfo,
  attachedTo: Ref<Doc>,
  attachedToClass: Ref<Class<Doc>>,
  space: Ref<Space>,
  modifiedOn: Timestamp,
  notifyResult: NotifyResult,
  _class = notification.class.CommonInboxNotification
): Promise<Tx[]> {
  if (notifyResult.size === 0) {
    return []
  }

  const res: Tx[] = []
  const resources = await control.modelDb.findAll(serverNotification.class.NotificationProviderResources, {})

  for (const [provider] of notifyResult.entries()) {
    if (provider === notification.providers.InboxNotificationProvider) {
      const notifyContexts = await control.findAll(notification.class.DocNotifyContext, { attachedTo })

      await pushInboxNotifications(
        control,
        res,
        receiver,
        attachedTo,
        attachedToClass,
        space,
        notifyContexts,
        data,
        _class,
        modifiedOn,
        sender,
        notifyResult.has(notification.providers.PushNotificationProvider)
      )
      continue
    }

    const resource = resources.find((it) => it.provider === provider)
    if (resource === undefined) continue

    const fn = await getResource(resource.fn)
    const txes = await fn(control, notifyResult.get(provider) ?? [], doc, receiver, sender)
    if (txes.length > 0) {
      res.push(...txes)
    }
  }

  return res
}

async function getTextPart (doc: Doc, control: TriggerControl): Promise<string | undefined> {
  const TextPresenter = getTextPresenter(doc._class, control.hierarchy)
  console.log({ _class: doc._class, presenter: TextPresenter })
  if (TextPresenter === undefined) return
  return await (
    await getResource(TextPresenter.presenter)
  )(doc, control)
}

async function getHtmlPart (doc: Doc, control: TriggerControl): Promise<string | undefined> {
  const HTMLPresenter = getHTMLPresenter(doc._class, control.hierarchy)
  return HTMLPresenter != null ? await (await getResource(HTMLPresenter.presenter))(doc, control) : undefined
}

function fillTemplate (template: string, sender: string, doc: string, data: string): string {
  let res = replaceAll(template, '{sender}', sender)
  res = replaceAll(res, '{doc}', doc)
  res = replaceAll(res, '{data}', data)
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
  data: string
): Promise<Content | undefined> {
  if (doc === undefined) return
  const notificationType = control.modelDb.getObject(type)

  const textPart = await getTextPart(doc, control)
  if (textPart === undefined) return
  if (notificationType.templates === undefined) return
  const text = fillTemplate(notificationType.templates.textTemplate, sender, textPart, data)
  const htmlPart = await getHtmlPart(doc, control)
  const html = fillTemplate(notificationType.templates.htmlTemplate, sender, htmlPart ?? textPart, data)
  const subject = fillTemplate(notificationType.templates.subjectTemplate, sender, textPart, data)
  return {
    text,
    html,
    subject
  }
}

async function getValueCollaborators (value: any, attr: AnyAttribute, control: TriggerControl): Promise<Ref<Account>[]> {
  const hierarchy = control.hierarchy
  if (attr.type._class === core.class.RefTo) {
    const to = (attr.type as RefTo<Doc>).to
    if (hierarchy.isDerived(to, contact.class.Person)) {
      const acc = await getPersonAccount(value, control)
      return acc !== undefined ? [acc._id] : []
    } else if (hierarchy.isDerived(to, core.class.Account)) {
      const acc = await getPersonAccountById(value, control)
      return acc !== undefined ? [acc._id] : []
    }
  } else if (attr.type._class === core.class.ArrOf) {
    const arrOf = (attr.type as ArrOf<RefTo<Doc>>).of
    if (arrOf._class === core.class.RefTo) {
      const to = (arrOf as RefTo<Doc>).to
      if (hierarchy.isDerived(to, contact.class.Person)) {
        const employeeAccounts = await control.modelDb.findAll(contact.class.PersonAccount, {
          person: { $in: Array.isArray(value) ? value : [value] }
        })
        return employeeAccounts.map((p) => p._id)
      } else if (hierarchy.isDerived(to, core.class.Account)) {
        const employeeAccounts = await control.modelDb.findAll(contact.class.PersonAccount, {
          _id: { $in: Array.isArray(value) ? value : [value] }
        })
        return employeeAccounts.map((p) => p._id)
      }
    }
  }
  return []
}

async function getKeyCollaborators (
  doc: Doc,
  value: any,
  field: string,
  control: TriggerControl
): Promise<Ref<Account>[] | undefined> {
  if (value !== undefined && value !== null) {
    const attr = control.hierarchy.findAttribute(doc._class, field)
    if (attr !== undefined) {
      return await getValueCollaborators(value, attr, control)
    }
  }
}

/**
 * @public
 */
export async function getDocCollaborators (
  doc: Doc,
  mixin: ClassCollaborators,
  control: TriggerControl
): Promise<Ref<Account>[]> {
  const collaborators = new Set<Ref<Account>>()
  for (const field of mixin.fields) {
    const value = (doc as any)[field]
    const newCollaborators = await getKeyCollaborators(doc, value, field, control)
    if (newCollaborators !== undefined) {
      for (const newCollaborator of newCollaborators) {
        collaborators.add(newCollaborator)
      }
    }
  }
  return Array.from(collaborators.values())
}

function getDocNotifyContext (
  docNotifyContexts: DocNotifyContext[],
  targetUser: Ref<Account>,
  attachedTo: Ref<Doc>,
  res: Tx[]
): DocNotifyContext | undefined {
  const context = docNotifyContexts.find((context) => context.user === targetUser && context.attachedTo === attachedTo)

  if (context !== undefined) {
    return context
  }

  const contextTx = (res as TxCUD<Doc>[]).find((tx) => {
    if (tx._class === core.class.TxCreateDoc && tx.objectClass === notification.class.DocNotifyContext) {
      const createTx = tx as TxCreateDoc<DocNotifyContext>

      return createTx.attributes.attachedTo === attachedTo && createTx.attributes.user === targetUser
    }

    return false
  }) as TxCreateDoc<DocNotifyContext> | undefined

  if (contextTx !== undefined) {
    return TxProcessor.createDoc2Doc(contextTx)
  }

  return undefined
}

export async function pushInboxNotifications (
  control: TriggerControl,
  res: Tx[],
  target: UserInfo,
  attachedTo: Ref<Doc>,
  attachedToClass: Ref<Class<Doc>>,
  space: Ref<Space>,
  contexts: DocNotifyContext[],
  data: Partial<Data<InboxNotification>>,
  _class: Ref<Class<InboxNotification>>,
  modifiedOn: Timestamp,
  sender: UserInfo,
  shouldPush: boolean,
  shouldUpdateTimestamp = true,
  cache: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>()
): Promise<void> {
  const account = target.account

  if (account === undefined) {
    return
  }
  const context = getDocNotifyContext(contexts, account._id, attachedTo, res)

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  const isHidden = !!context?.hidden

  let docNotifyContextId: Ref<DocNotifyContext>

  if (context === undefined) {
    const createContextTx = control.txFactory.createTxCreateDoc(notification.class.DocNotifyContext, space, {
      user: account._id,
      attachedTo,
      attachedToClass,
      hidden: false,
      lastUpdateTimestamp: shouldUpdateTimestamp ? modifiedOn : undefined
    })
    await control.apply([createContextTx])
    control.operationContext.derived.targets['docNotifyContext' + createContextTx._id] = (it) => {
      if (it._id === createContextTx._id) {
        return [account.email]
      }
    }
    docNotifyContextId = createContextTx.objectId
  } else {
    if (shouldUpdateTimestamp && context.lastUpdateTimestamp !== modifiedOn) {
      const updateTx = control.txFactory.createTxUpdateDoc(context._class, context.space, context._id, {
        lastUpdateTimestamp: modifiedOn
      })
      await control.apply([updateTx])
      control.operationContext.derived.targets['docNotifyContext' + updateTx._id] = (it) => {
        if (it._id === updateTx._id) {
          return [account.email]
        }
      }
    }
    docNotifyContextId = context._id
  }

  if (!isHidden) {
    const notificationData = {
      user: account._id,
      isViewed: false,
      docNotifyContext: docNotifyContextId,
      ...data
    }
    const notificationTx = control.txFactory.createTxCreateDoc(_class, space, notificationData)
    res.push(notificationTx)
    if (shouldPush) {
      // const now = Date.now()
      const pushTx = await createPushFromInbox(
        control,
        target,
        attachedTo,
        attachedToClass,
        notificationData,
        _class,
        sender,
        notificationTx.objectId,
        cache
      )
      // console.log('Push takes', Date.now() - now, 'ms')
      if (pushTx !== undefined) {
        res.push(pushTx)
      }
    }
  }
}

async function activityInboxNotificationToText (doc: Data<ActivityInboxNotification>): Promise<[string, string]> {
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

  return [title, body]
}

async function commonInboxNotificationToText (doc: Data<CommonInboxNotification>): Promise<[string, string]> {
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
  return [title, body]
}

async function mentionInboxNotificationToText (
  doc: Data<MentionInboxNotification>,
  control: TriggerControl
): Promise<[string, string]> {
  let obj = (await control.findAll(doc.mentionedInClass, { _id: doc.mentionedIn }, { limit: 1 }))[0]
  if (obj !== undefined) {
    if (control.hierarchy.isDerived(obj._class, chunter.class.ChatMessage)) {
      obj = (
        await control.findAll(
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

export async function createPushFromInbox (
  control: TriggerControl,
  target: UserInfo,
  attachedTo: Ref<Doc>,
  attachedToClass: Ref<Class<Doc>>,
  data: Data<InboxNotification>,
  _class: Ref<Class<InboxNotification>>,
  sender: UserInfo,
  _id: Ref<Doc>,
  cache: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>()
): Promise<Tx | undefined> {
  let title: string = ''
  let body: string = ''
  if (control.hierarchy.isDerived(_class, notification.class.ActivityInboxNotification)) {
    ;[title, body] = await activityInboxNotificationToText(data as Data<ActivityInboxNotification>)
  } else if (control.hierarchy.isDerived(_class, notification.class.MentionInboxNotification)) {
    ;[title, body] = await mentionInboxNotificationToText(data as Data<MentionInboxNotification>, control)
  } else if (control.hierarchy.isDerived(_class, notification.class.CommonInboxNotification)) {
    ;[title, body] = await commonInboxNotificationToText(data as Data<CommonInboxNotification>)
  }
  if (title === '' || body === '') {
    return
  }

  const senderPerson = sender.person
  const linkProviders = control.modelDb.findAllSync(serverView.mixin.ServerLinkIdProvider, {})
  const provider = linkProviders.find(({ _id }) => _id === attachedToClass)

  let id: string = attachedTo

  if (provider !== undefined) {
    const encodeFn = await getResource(provider.encode)
    const doc = cache.get(attachedTo) ?? (await control.findAll(attachedToClass, { _id: attachedTo }))[0]

    if (doc === undefined) {
      return
    }

    cache.set(doc._id, doc)
    id = await encodeFn(doc, control)
  }

  const path = [workbenchId, control.workspace.workspaceUrl, notificationId, encodeObjectURI(id, attachedToClass)]
  await createPushNotification(control, target._id as Ref<PersonAccount>, title, body, _id, senderPerson, path)
  return control.txFactory.createTxCreateDoc(notification.class.BrowserNotification, core.space.Workspace, {
    user: target._id,
    status: NotificationStatus.New,
    title,
    body,
    senderId: sender._id,
    tag: _id,
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
  senderAvatar?: Data<AvatarInfo>,
  path?: string[]
): Promise<void> {
  const publicKey = getMetadata(notification.metadata.PushPublicKey)
  const privateKey = getMetadata(serverNotification.metadata.PushPrivateKey)
  const subject = getMetadata(serverNotification.metadata.PushSubject) ?? 'mailto:hey@huly.io'
  if (privateKey === undefined || publicKey === undefined) return
  const subscriptions = (await control.queryFind(notification.class.PushSubscription, {})).filter(
    (p) => p.user === target
  )
  const data: PushData = {
    title,
    body
  }
  if (_id !== undefined) {
    data.tag = _id
  }
  const front = control.branding?.front ?? getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const uploadUrl = getMetadata(serverCore.metadata.UploadURL) ?? ''
  const domainPath = `${workbenchId}/${control.workspace.workspaceUrl}`
  data.domain = concatLink(front, domainPath)
  if (path !== undefined) {
    data.url = concatLink(front, path.join('/'))
  }
  if (senderAvatar != null) {
    const provider = getAvatarProviderId(senderAvatar.avatarType)
    if (provider === contact.avatarProvider.Image) {
      data.icon = concatLink(uploadUrl, `?file=${senderAvatar.avatar}`)
    } else if (provider === contact.avatarProvider.Gravatar && senderAvatar.avatarProps?.url !== undefined) {
      data.icon = getGravatarUrl(senderAvatar.avatarProps?.url, 512)
    }
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  for (const subscription of subscriptions) {
    void sendPushToSubscription(control, target, subscription, data)
  }
}

async function sendPushToSubscription (
  control: TriggerControl,
  targetUser: Ref<Account>,
  subscription: PushSubscription,
  data: PushData
): Promise<void> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(data))
  } catch (err) {
    console.log('Cannot send push notification to', targetUser, err)
    if (err instanceof WebPushError && err.body.includes('expired')) {
      const tx = control.txFactory.createTxRemoveDoc(subscription._class, subscription.space, subscription._id)
      await control.apply([tx])
    }
  }
}

/**
 * @public
 */
export async function pushActivityInboxNotifications (
  originTx: TxCUD<Doc>,
  control: TriggerControl,
  res: Tx[],
  target: UserInfo,
  sender: UserInfo,
  object: Doc,
  docNotifyContexts: DocNotifyContext[],
  activityMessages: ActivityMessage[],
  shouldUpdateTimestamp: boolean,
  shouldPush: boolean,
  cache: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>()
): Promise<void> {
  if (target.account === undefined) {
    return
  }

  for (const activityMessage of activityMessages) {
    const content = await getNotificationContent(originTx, target.account, sender, object, control)
    const data: Partial<Data<ActivityInboxNotification>> = {
      ...content,
      attachedTo: activityMessage._id,
      attachedToClass: activityMessage._class
    }

    await pushInboxNotifications(
      control,
      res,
      target,
      activityMessage.attachedTo,
      activityMessage.attachedToClass,
      activityMessage.space,
      docNotifyContexts,
      data,
      notification.class.ActivityInboxNotification,
      activityMessage.modifiedOn,
      sender,
      shouldPush,
      shouldUpdateTimestamp,
      cache
    )
  }
}

export async function getNotificationTxes (
  control: TriggerControl,
  object: Doc,
  tx: TxCUD<Doc>,
  originTx: TxCUD<Doc>,
  target: UserInfo,
  sender: UserInfo,
  params: NotifyParams,
  docNotifyContexts: DocNotifyContext[],
  activityMessages: ActivityMessage[],
  cache: Map<Ref<Doc>, Doc>
): Promise<Tx[]> {
  if (target.account === undefined) {
    return []
  }

  const res: Tx[] = []
  const resources = await control.modelDb.findAll(serverNotification.class.NotificationProviderResources, {})

  for (const message of activityMessages) {
    const docMessage = message._class === activity.class.DocUpdateMessage ? (message as DocUpdateMessage) : undefined
    const notifyResult = await isShouldNotifyTx(
      control,
      tx,
      originTx,
      object,
      target.account,
      params.isOwn,
      params.isSpace,
      docMessage
    )

    for (const [provider, types] of notifyResult.entries()) {
      if (provider === notification.providers.InboxNotificationProvider) {
        await pushActivityInboxNotifications(
          originTx,
          control,
          res,
          target,
          sender,
          object,
          docNotifyContexts,
          [message],
          params.shouldUpdateTimestamp,
          notifyResult.has(notification.providers.PushNotificationProvider),
          cache
        )
        continue
      }

      const resource = resources.find((it) => it.provider === provider)

      if (resource === undefined) continue

      const fn = await getResource(resource.fn)

      const txes = await fn(control, types, object, target, sender)
      if (txes.length > 0) {
        res.push(...txes)
      }
    }
  }
  return res
}

export async function createCollabDocInfo (
  collaborators: Ref<PersonAccount>[],
  control: TriggerControl,
  tx: TxCUD<Doc>,
  originTx: TxCUD<Doc>,
  object: Doc,
  activityMessages: ActivityMessage[],
  params: NotifyParams,
  cache: Map<Ref<Doc>, Doc>
): Promise<Tx[]> {
  let res: Tx[] = []

  if (originTx.space === core.space.DerivedTx) {
    return res
  }

  const docMessages = activityMessages.filter((message) => message.attachedTo === object._id)
  if (docMessages.length === 0) {
    return res
  }

  const targets = new Set(collaborators)

  // user is not collaborator of himself, but we should notify user of changes related to users account (mentions, comments etc)
  if (control.hierarchy.isDerived(object._class, contact.class.Person)) {
    const acc = await getPersonAccount(object._id as Ref<Person>, control)
    if (acc !== undefined) {
      targets.add(acc._id)
    }
  }

  if (targets.size === 0) {
    return res
  }

  const notifyContexts = await control.findAll(notification.class.DocNotifyContext, {
    attachedTo: object._id
  })

  const usersInfo = await getUsersInfo([...Array.from(targets), originTx.modifiedBy as Ref<PersonAccount>], control)
  const sender = usersInfo.find(({ _id }) => _id === originTx.modifiedBy) ?? {
    _id: originTx.modifiedBy
  }

  for (const target of targets) {
    const info = usersInfo.find(({ _id }) => _id === target)

    if (info === undefined) continue

    res = res.concat(
      await getNotificationTxes(control, object, tx, originTx, info, sender, params, notifyContexts, docMessages, cache)
    )
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

async function getSpaceCollabTxes (
  control: TriggerControl,
  doc: Doc,
  tx: TxCUD<Doc>,
  originTx: TxCUD<Doc>,
  activityMessages: ActivityMessage[],
  cache: Map<Ref<Doc>, Doc>
): Promise<Tx[]> {
  if (doc.space === core.space.Space) {
    return []
  }

  const space = cache.get(doc.space) ?? (await control.findAll(core.class.Space, { _id: doc.space }))[0]
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
        collabs.collaborators as Ref<PersonAccount>[],
        control,
        tx,
        originTx,
        doc,
        activityMessages,
        { isSpace: true, isOwn: false, shouldUpdateTimestamp: true },
        cache
      )
    }
  }
  return []
}

async function createCollaboratorDoc (
  tx: TxCreateDoc<Doc>,
  control: TriggerControl,
  activityMessage: ActivityMessage[],
  originTx: TxCUD<Doc>,
  cache: Map<Ref<Doc>, Doc>
): Promise<Tx[]> {
  const res: Tx[] = []
  const hierarchy = control.hierarchy
  const mixin = hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)

  if (mixin === undefined) {
    return res
  }

  const doc = TxProcessor.createDoc2Doc(tx)
  const collaborators = await getDocCollaborators(doc, mixin, control)
  const mixinTx = getMixinTx(tx, control, collaborators)

  const notificationTxes = await createCollabDocInfo(
    collaborators as Ref<PersonAccount>[],
    control,
    tx,
    originTx,
    doc,
    activityMessage,
    { isOwn: true, isSpace: false, shouldUpdateTimestamp: true },
    cache
  )
  res.push(mixinTx)
  res.push(...notificationTxes)

  res.push(...(await getSpaceCollabTxes(control, doc, tx, originTx, activityMessage, cache)))

  return res
}

async function updateCollaboratorsMixin (
  tx: TxMixin<Doc, Collaborators>,
  control: TriggerControl,
  activityMessages: ActivityMessage[],
  originTx: TxCUD<Doc>,
  cache: Map<Ref<Doc>, Doc>
): Promise<Tx[]> {
  const { hierarchy } = control

  if (tx._class !== core.class.TxMixin) return []
  if (originTx.space === core.space.DerivedTx) return []
  if (!hierarchy.isDerived(tx.mixin, notification.mixin.Collaborators)) return []

  const res: Tx[] = []

  if (tx.attributes.collaborators !== undefined) {
    const createTx = hierarchy.isDerived(tx.objectClass, core.class.AttachedDoc)
      ? (
          await control.findAll(core.class.TxCollectionCUD, {
            'tx.objectId': tx.objectId,
            'tx._class': core.class.TxCreateDoc
          })
        )[0]
      : (
          await control.findAll(core.class.TxCreateDoc, {
            objectId: tx.objectId
          })
        )[0]
    const mixinTxes = await control.findAll(core.class.TxMixin, {
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
      prevCollabs = mixin !== undefined ? new Set(await getDocCollaborators(prevDoc, mixin, control)) : new Set()
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
          if (await isAllowed(control, collab as Ref<PersonAccount>, type, provider)) {
            newCollabs.push(collab)
            break
          }
        }
      }
    }

    if (newCollabs.length > 0) {
      const docNotifyContexts = await control.findAll(notification.class.DocNotifyContext, {
        user: { $in: newCollabs },
        attachedTo: tx.objectId
      })

      const infos = await getUsersInfo([...newCollabs, originTx.modifiedBy] as Ref<PersonAccount>[], control)
      const sender = infos.find(({ _id }) => _id === originTx.modifiedBy) ?? { _id: originTx.modifiedBy }

      for (const collab of newCollabs) {
        const target = infos.find(({ _id }) => _id === collab)

        if (target === undefined) continue

        await pushActivityInboxNotifications(
          originTx,
          control,
          res,
          target,
          sender,
          prevDoc,
          docNotifyContexts,
          activityMessages,
          true,
          false,
          cache
        )
      }
    }
  }
  return res
}

async function collectionCollabDoc (
  tx: TxCollectionCUD<Doc, AttachedDoc>,
  control: TriggerControl,
  activityMessages: ActivityMessage[],
  cache: Map<Ref<Doc>, Doc>
): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx) as TxCUD<Doc>
  let res = await createCollaboratorNotifications(control.ctx, actualTx, control, activityMessages, tx, cache)

  if (![core.class.TxCreateDoc, core.class.TxRemoveDoc, core.class.TxUpdateDoc].includes(actualTx._class)) {
    return res
  }

  const mixin = control.hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)

  if (mixin === undefined) {
    return res
  }

  const doc = cache.get(tx.objectId) ?? (await control.findAll(tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]

  if (doc === undefined) {
    return res
  }

  cache.set(doc._id, doc)

  const collaborators = await getCollaborators(doc, control, tx, res)

  res = res.concat(
    await createCollabDocInfo(
      collaborators as Ref<PersonAccount>[],
      control,
      actualTx,
      tx,
      doc,
      activityMessages,
      { isOwn: false, isSpace: false, shouldUpdateTimestamp: true },
      cache
    )
  )

  return res
}

async function removeCollaboratorDoc (tx: TxRemoveDoc<Doc>, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const mixin = hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)

  if (mixin === undefined) {
    return []
  }

  const res: Tx[] = []
  const notifyContexts = await control.findAll(
    notification.class.DocNotifyContext,
    { attachedTo: tx.objectId },
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

  const inboxNotifications = await control.findAll(
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

  inboxNotifications.forEach((notification) => {
    res.push(control.txFactory.createTxRemoveDoc(notification._class, notification.space, notification._id))
  })
  notifyContexts.forEach((context) => {
    res.push(control.txFactory.createTxRemoveDoc(context._class, context.space, context._id))
  })

  return res
}

async function getNewCollaborators (
  ops: DocumentUpdate<Doc> | MixinUpdate<Doc, Doc>,
  mixin: ClassCollaborators,
  doc: Doc,
  control: TriggerControl
): Promise<Ref<Account>[]> {
  const newCollaborators = new Set<Ref<Account>>()
  if (ops.$push !== undefined) {
    for (const key in ops.$push) {
      if (mixin.fields.includes(key)) {
        let value = (ops.$push as any)[key]
        if (typeof value !== 'string') {
          value = value.$each
        }
        const newCollabs = await getKeyCollaborators(doc, value, key, control)
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
      const newCollabs = await getKeyCollaborators(doc, value, key, control)
      if (newCollabs !== undefined) {
        for (const newCollab of newCollabs) {
          newCollaborators.add(newCollab)
        }
      }
    }
  }
  return Array.from(newCollaborators.values())
}

async function updateCollaboratorDoc (
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
  const doc = (await control.findAll(tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]
  if (doc === undefined) return []
  const params: NotifyParams = { isOwn: true, isSpace: false, shouldUpdateTimestamp: true }
  if (hierarchy.hasMixin(doc, notification.mixin.Collaborators)) {
    // we should handle change field and subscribe new collaborators
    const collabMixin = hierarchy.as(doc, notification.mixin.Collaborators)
    const collabs = new Set(collabMixin.collaborators)
    const ops = isMixinTx(tx) ? tx.attributes : tx.operations
    const newCollaborators = (await getNewCollaborators(ops, mixin, doc, control)).filter((p) => !collabs.has(p))

    if (newCollaborators.length > 0) {
      res.push(
        control.txFactory.createTxMixin(tx.objectId, tx.objectClass, tx.objectSpace, notification.mixin.Collaborators, {
          $push: {
            collaborators: {
              $each: newCollaborators,
              $position: 0
            }
          }
        })
      )
    }
    res = res.concat(
      await createCollabDocInfo(
        [...collabMixin.collaborators, ...newCollaborators] as Ref<PersonAccount>[],
        control,
        tx,
        originTx,
        doc,
        activityMessages,
        params,
        cache
      )
    )
  } else {
    const collaborators = await getDocCollaborators(doc, mixin, control)
    res.push(getMixinTx(tx, control, collaborators))
    res = res.concat(
      await createCollabDocInfo(
        collaborators as Ref<PersonAccount>[],
        control,
        tx,
        originTx,
        doc,
        activityMessages,
        params,
        cache
      )
    )
  }

  res = res.concat(await getSpaceCollabTxes(control, doc, tx, originTx, activityMessages, cache))
  res = res.concat(await updateNotifyContextsSpace(control, tx))

  return res
}

/**
 * @public
 */
export async function OnAttributeCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const attribute = TxProcessor.createDoc2Doc(tx as TxCreateDoc<AnyAttribute>)
  const group = (
    await control.modelDb.findAll(notification.class.NotificationGroup, { objectClass: attribute.attributeOf })
  )[0]
  if (group === undefined) return []
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
    label: attribute.label
  }
  if (isCollection) {
    data.attachedToClass = attribute.attributeOf
  }
  const id =
    `${notification.class.NotificationType}_${attribute.attributeOf}_${attribute.name}` as Ref<NotificationType>
  const res = control.txFactory.createTxCreateDoc(notification.class.NotificationType, core.space.Model, data, id)
  return [res]
}

/**
 * @public
 */
export async function OnAttributeUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ctx = tx as TxUpdateDoc<AnyAttribute>
  if (ctx.operations.hidden === undefined) return []
  const type = (await control.findAll(notification.class.NotificationType, { attribute: ctx.objectId }))[0]
  if (type === undefined) return []
  const res = control.txFactory.createTxUpdateDoc(type._class, type.space, type._id, {
    hidden: ctx.operations.hidden
  })
  return [res]
}

async function applyUserTxes (
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
    const account = (cache.get(user) as PersonAccount) ?? (await getPersonAccountById(user, control))

    if (account !== undefined) {
      cache.set(account._id, account)
      await control.apply(txs)

      const m1 = toIdMap(txs)
      control.operationContext.derived.targets.docNotifyContext = (it) => {
        if (m1.has(it._id)) {
          return [account.email]
        }
      }
    }
  }

  return res
}

export async function createCollaboratorNotifications (
  ctx: MeasureContext,
  tx: TxCUD<Doc>,
  control: TriggerControl,
  activityMessages: ActivityMessage[],
  originTx?: TxCUD<Doc>,
  cache: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>()
): Promise<Tx[]> {
  if (tx.space === core.space.DerivedTx) {
    return []
  }

  if (activityMessages.length === 0) {
    return []
  }

  switch (tx._class) {
    case core.class.TxCreateDoc: {
      const res = await createCollaboratorDoc(tx as TxCreateDoc<Doc>, control, activityMessages, originTx ?? tx, cache)

      return await applyUserTxes(control, res)
    }
    case core.class.TxUpdateDoc:
    case core.class.TxMixin: {
      let res = await updateCollaboratorDoc(tx as TxUpdateDoc<Doc>, control, originTx ?? tx, activityMessages, cache)
      res = res.concat(
        await updateCollaboratorsMixin(
          tx as TxMixin<Doc, Collaborators>,
          control,
          activityMessages,
          originTx ?? tx,
          cache
        )
      )
      return await applyUserTxes(control, res)
    }
    case core.class.TxCollectionCUD: {
      const res = await collectionCollabDoc(tx as TxCollectionCUD<Doc, AttachedDoc>, control, activityMessages, cache)
      return await applyUserTxes(control, res)
    }
  }

  return []
}

/**
 * @public
 */
export async function removeDocInboxNotifications (_id: Ref<ActivityMessage>, control: TriggerControl): Promise<Tx[]> {
  const inboxNotifications = await control.findAll(notification.class.InboxNotification, { attachedTo: _id })

  return inboxNotifications.map((inboxNotification) =>
    control.txFactory.createTxRemoveDoc(
      notification.class.InboxNotification,
      inboxNotification.space,
      inboxNotification._id
    )
  )
}

async function OnActivityNotificationViewed (
  tx: TxUpdateDoc<InboxNotification>,
  control: TriggerControl
): Promise<Tx[]> {
  if (tx.objectClass !== notification.class.ActivityInboxNotification || tx.operations.isViewed !== true) {
    return []
  }

  const inboxNotification = (
    await control.findAll(
      notification.class.ActivityInboxNotification,
      {
        _id: tx.objectId as Ref<ActivityInboxNotification>
      },
      { projection: { _id: 1, attachedTo: 1, user: 1 } }
    )
  )[0]

  if (inboxNotification === undefined) {
    return []
  }

  // Read reactions notifications when message is read
  const { attachedTo, user } = inboxNotification

  const reactionMessages = await control.findAll(
    activity.class.DocUpdateMessage,
    {
      attachedTo,
      objectClass: activity.class.Reaction
    },
    { projection: { _id: 1 } }
  )

  if (reactionMessages.length === 0) {
    return []
  }

  const reactionNotifications = await control.findAll(
    notification.class.ActivityInboxNotification,
    {
      attachedTo: { $in: reactionMessages.map(({ _id }) => _id) },
      user
    },
    { projection: { _id: 1, _class: 1, space: 1 } }
  )

  return reactionNotifications.map(({ _id, _class, space }) =>
    control.txFactory.createTxUpdateDoc(_class, space, _id, { isViewed: true })
  )
}

export async function getCollaborators (
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
    const collaborators = await getDocCollaborators(doc, mixin, control)

    res.push(getMixinTx(tx, control, collaborators))
    return collaborators
  }
}

async function OnDocRemove (tx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const etx = TxProcessor.extractTx(tx)

  if (etx._class !== core.class.TxRemoveDoc) return []

  return await removeCollaboratorDoc(etx as TxRemoveDoc<Doc>, control)
}

export * from './types'
export * from './utils'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnAttributeCreate,
    OnAttributeUpdate,
    OnActivityNotificationViewed,
    OnDocRemove
  },
  function: {
    IsUserInFieldValue: isUserInFieldValue,
    IsUserEmployeeInFieldValue: isUserEmployeeInFieldValue
  }
})
