//
// Copyright © 2025 Hardcore Engineering Inc.
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

import serverCore, { TriggerControl } from '@hcengineering/server-core'
import serverNotification, { PUSH_NOTIFICATION_TITLE_SIZE } from '@hcengineering/server-notification'
import {
  Account,
  Class,
  concatLink,
  Data,
  Doc,
  Hierarchy,
  Ref,
  Tx,
  TxCreateDoc,
  TxProcessor
} from '@hcengineering/core'
import notification, {
  ActivityInboxNotification,
  InboxNotification,
  MentionInboxNotification,
  notificationId,
  PushData,
  PushSubscription
} from '@hcengineering/notification'
import activity, { ActivityMessage } from '@hcengineering/activity'
import serverView from '@hcengineering/server-view'
import { getMetadata, getResource } from '@hcengineering/platform'
import { workbenchId } from '@hcengineering/workbench'
import { encodeObjectURI } from '@hcengineering/view'
import contact, {
  type AvatarInfo,
  getAvatarProviderId,
  getGravatarUrl,
  Person,
  PersonAccount,
  PersonSpace
} from '@hcengineering/contact'
import { AvailableProvidersCache, AvailableProvidersCacheKey, getTranslatedNotificationContent } from './index'

async function createPushFromInbox (
  control: TriggerControl,
  n: InboxNotification,
  receiver: Ref<Account>,
  receiverSpace: Ref<PersonSpace>,
  subscriptions: PushSubscription[],
  senderPerson?: Person
): Promise<Tx | undefined> {
  let { title, body } = await getTranslatedNotificationContent(n, n._class, control)

  if (title === '' || body === '') {
    return
  }

  title = title.slice(0, PUSH_NOTIFICATION_TITLE_SIZE)

  const linkProviders = control.modelDb.findAllSync(serverView.mixin.ServerLinkIdProvider, {})
  const provider = linkProviders.find(({ _id }) => _id === n.objectClass)

  let id: string = n.objectId

  if (provider !== undefined) {
    const encodeFn = await getResource(provider.encode)
    const cache: Map<Ref<Doc>, Doc> = control.contextCache.get('PushNotificationsHandler') ?? new Map()
    const doc = cache.get(n.objectId) ?? (await control.findAll(control.ctx, n.objectClass, { _id: n.objectId }))[0]

    if (doc === undefined) {
      return
    }

    cache.set(n.objectId, doc)
    control.contextCache.set('PushNotificationsHandler', cache)

    id = await encodeFn(doc, control)
  }

  const path = [workbenchId, control.workspace.workspaceUrl, notificationId, encodeObjectURI(id, n.objectClass)]
  await createPushNotification(
    control,
    receiver as Ref<PersonAccount>,
    title,
    body,
    n._id,
    subscriptions,
    senderPerson,
    path
  )

  const messageInfo = getMessageInfo(n, control.hierarchy)
  return control.txFactory.createTxCreateDoc(notification.class.BrowserNotification, receiverSpace, {
    user: receiver,
    title,
    body,
    senderId: n.createdBy ?? n.modifiedBy,
    tag: n._id,
    objectId: n.objectId,
    objectClass: n.objectClass,
    messageId: messageInfo._id,
    messageClass: messageInfo._class,
    onClickLocation: {
      path
    }
  })
}

function getMessageInfo (
  n: InboxNotification,
  hierarchy: Hierarchy
): {
    _id?: Ref<ActivityMessage>
    _class?: Ref<Class<ActivityMessage>>
  } {
  if (hierarchy.isDerived(n._class, notification.class.ActivityInboxNotification)) {
    const activityNotification = n as ActivityInboxNotification

    if (
      activityNotification.attachedToClass === activity.class.DocUpdateMessage &&
      hierarchy.isDerived(activityNotification.objectClass, activity.class.ActivityMessage)
    ) {
      return {
        _id: activityNotification.objectId as Ref<ActivityMessage>,
        _class: activityNotification.objectClass
      }
    }

    return {
      _id: activityNotification.attachedTo,
      _class: activityNotification.attachedToClass
    }
  }

  if (hierarchy.isDerived(n._class, notification.class.MentionInboxNotification)) {
    const mentionNotification = n as MentionInboxNotification
    if (hierarchy.isDerived(mentionNotification.mentionedInClass, activity.class.ActivityMessage)) {
      return {
        _id: mentionNotification.mentionedIn as Ref<ActivityMessage>,
        _class: mentionNotification.mentionedInClass
      }
    }
  }

  return {}
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
  const sesURL: string | undefined = getMetadata(serverNotification.metadata.SesUrl)
  const sesAuth: string | undefined = getMetadata(serverNotification.metadata.SesAuthToken)
  if (sesURL === undefined || sesURL === '') return
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

  void sendPushToSubscription(sesURL, sesAuth, control, target, userSubscriptions, data)
}

async function sendPushToSubscription (
  sesURL: string,
  sesAuth: string | undefined,
  control: TriggerControl,
  targetUser: Ref<Account>,
  subscriptions: PushSubscription[],
  data: PushData
): Promise<void> {
  try {
    const result: Ref<PushSubscription>[] = (
      await (
        await fetch(concatLink(sesURL, '/web-push'), {
          method: 'post',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            ...(sesAuth != null ? { Authorization: `Bearer ${sesAuth}` } : {})
          },
          body: JSON.stringify({
            subscriptions,
            data
          })
        })
      ).json()
    ).result
    if (result.length > 0) {
      const domain = control.hierarchy.findDomain(notification.class.PushSubscription)
      if (domain !== undefined) {
        await control.lowLevel.clean(control.ctx, domain, result)
      }
    }
  } catch (err) {
    control.ctx.info('Cannot send push notification to', { user: targetUser, err })
  }
}

export async function PushNotificationsHandler (
  txes: TxCreateDoc<InboxNotification>[],
  control: TriggerControl
): Promise<Tx[]> {
  const availableProviders: AvailableProvidersCache = control.contextCache.get(AvailableProvidersCacheKey) ?? new Map()

  const all: InboxNotification[] = txes
    .map((tx) => TxProcessor.createDoc2Doc(tx))
    .filter(
      (it) =>
        availableProviders.get(it._id)?.find((p) => p === notification.providers.PushNotificationProvider) !== undefined
    )

  if (all.length === 0) {
    return []
  }

  const receivers = new Set(all.map((it) => it.user))
  const subscriptions = (await control.queryFind(control.ctx, notification.class.PushSubscription, {})).filter((it) =>
    receivers.has(it.user)
  )

  if (subscriptions.length === 0) {
    return []
  }

  const senders = Array.from(new Set(all.map((it) => it.createdBy)))
  const senderAccounts = await control.modelDb.findAll(contact.class.PersonAccount, {
    _id: { $in: senders as Ref<PersonAccount>[] }
  })
  const senderPersons = await control.findAll(control.ctx, contact.class.Person, {
    _id: { $in: Array.from(new Set(senderAccounts.map((it) => it.person))) }
  })

  const res: Tx[] = []

  for (const inboxNotification of all) {
    const { user } = inboxNotification
    const userSubscriptions = subscriptions.filter((it) => it.user === user)
    if (userSubscriptions.length === 0) continue

    const senderAccount = senderAccounts.find(
      (it) => it._id === (inboxNotification.createdBy ?? inboxNotification.modifiedBy)
    )
    const senderPerson =
      senderAccount !== undefined ? senderPersons.find((it) => it._id === senderAccount.person) : undefined
    const tx = await createPushFromInbox(
      control,
      inboxNotification,
      user,
      inboxNotification.space,
      userSubscriptions,
      senderPerson
    )

    if (tx !== undefined) {
      res.push(tx)
    }
  }

  return res
}
