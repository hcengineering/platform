//
// Copyright © 2022 Hardcore Engineering Inc.
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
/* eslint-disable @typescript-eslint/no-unused-vars */
import contact, { Channel, formatName, Person, SocialIdentity } from '@hcengineering/contact'
import core, {
  PersonId,
  Class,
  concatLink,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  MeasureContext,
  Ref,
  Tx,
  TxCreateDoc,
  TxProcessor,
  groupByArray,
  SocialIdType,
  Domain
} from '@hcengineering/core'
import gmail, { Message } from '@hcengineering/gmail'
import { TriggerControl } from '@hcengineering/server-core'
import notification, {
  NotificationType,
  InboxNotification,
  ActivityInboxNotification,
  MentionInboxNotification
} from '@hcengineering/notification'
import serverNotification from '@hcengineering/server-notification'
import {
  AvailableProvidersCache,
  AvailableProvidersCacheKey,
  getContentByTemplate,
  getNotificationProviderControl,
  getReceiversInfo,
  getAllowedProviders
} from '@hcengineering/server-notification-resources'
import { getMetadata } from '@hcengineering/platform'
import activity, { ActivityMessage } from '@hcengineering/activity'
import { getEmployeeByAcc, getPerson } from '@hcengineering/server-contact'

/**
 * @public
 */
export async function FindMessages (
  doc: Doc,
  hiearachy: Hierarchy,
  findAll: <T extends Doc>(
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
): Promise<Doc[]> {
  const channel = doc as Channel
  if (channel.provider !== contact.channelProvider.Email) {
    return []
  }
  const messages = await findAll(gmail.class.Message, { attachedTo: channel._id })
  const newMessages = await findAll(gmail.class.NewMessage, { attachedTo: channel._id })
  return [...messages, ...newMessages]
}

/**
 * @public
 */
export async function OnMessageCreate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const createTx = tx as TxCreateDoc<Message>

    const message = TxProcessor.createDoc2Doc<Message>(createTx)

    const channel = (
      await control.findAll(control.ctx, contact.class.Channel, { _id: message.attachedTo }, { limit: 1 })
    )[0]
    if (channel !== undefined) {
      if (channel.lastMessage === undefined || channel.lastMessage < message.sendOn) {
        const tx = control.txFactory.createTxUpdateDoc(channel._class, channel.space, channel._id, {
          lastMessage: message.sendOn
        })
        result.push(tx)
      }
    }
  }

  return result
}

/**
 * @public
 */
export function IsIncomingMessageTypeMatch (
  tx: Tx,
  doc: Doc,
  person: Ref<Person>,
  user: PersonId[],
  type: NotificationType,
  control: TriggerControl
): boolean {
  const message = TxProcessor.createDoc2Doc(tx as TxCreateDoc<Message>)
  return message.incoming && message.sendOn > (doc.createdOn ?? doc.modifiedOn)
}

export async function sendEmailNotification (
  ctx: MeasureContext,
  text: string,
  html: string,
  subject: string,
  receiver: string
): Promise<void> {
  try {
    const mailURL = getMetadata(serverNotification.metadata.MailUrl)
    if (mailURL === undefined || mailURL === '') {
      ctx.error('Please provide email service url to enable email notifications.')
      return
    }
    const mailAuth: string | undefined = getMetadata(serverNotification.metadata.MailAuthToken)
    const response = await fetch(concatLink(mailURL, '/send'), {
      method: 'post',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(mailAuth != null ? { Authorization: `Bearer ${mailAuth}` } : {})
      },
      body: JSON.stringify({
        text,
        html,
        subject,
        to: [receiver]
      })
    })
    if (!response.ok) {
      ctx.error(`Failed to send email notification: ${response.statusText}`)
    }
  } catch (err) {
    ctx.error('Could not send email notification', { err, receiver })
  }
}

async function notifyByEmail (
  control: TriggerControl,
  type: Ref<NotificationType>,
  doc: Doc,
  sender: Person | undefined,
  senderSocialId: PersonId,
  email: string,
  data: InboxNotification,
  message?: ActivityMessage
): Promise<void> {
  let senderName = sender !== undefined ? formatName(sender.name, control.branding?.lastNameFirst) : ''
  if (senderName === '' && senderSocialId === core.account.System) {
    senderName = 'System'
  }
  const content = await getContentByTemplate(doc, senderName, type, control, '', data, message)

  if (content !== undefined) {
    await sendEmailNotification(control.ctx, content.text, content.html, content.subject, email)
  } else {
    control.ctx.info('notifyByEmail: getContentByTemplate returned undefined, email not sent', {
      notificationId: data._id,
      type,
      docClass: doc._class
    })
  }
}

async function getNotificationMessages (
  notifications: InboxNotification[],
  control: TriggerControl
): Promise<ActivityMessage[]> {
  const { hierarchy } = control
  const ids: Ref<ActivityMessage>[] = []
  for (const n of notifications) {
    if (hierarchy.isDerived(n._class, notification.class.ActivityInboxNotification)) {
      const activityNotification = n as ActivityInboxNotification
      ids.push(activityNotification.attachedTo)
    } else if (hierarchy.isDerived(n._class, notification.class.MentionInboxNotification)) {
      const mentionNotification = n as MentionInboxNotification
      if (hierarchy.isDerived(mentionNotification.mentionedInClass, activity.class.ActivityMessage)) {
        ids.push(mentionNotification.mentionedIn as Ref<ActivityMessage>)
      }
    }
  }

  if (ids.length === 0) return []

  return await control.findAll(control.ctx, activity.class.ActivityMessage, { _id: { $in: ids } })
}

async function processEmailNotifications (control: TriggerControl, notifications: InboxNotification[]): Promise<void> {
  if (notifications.length === 0) return
  const docId = notifications[0].objectId
  const docClass = notifications[0].objectClass
  const doc = (await control.findAll(control.ctx, docClass, { _id: docId }))[0]
  if (doc === undefined) {
    control.ctx.info('processEmailNotifications: doc not found', { docId, docClass })
    return
  }
  const messages = await getNotificationMessages(notifications, control)
  const { hierarchy } = control

  const senders = new Map<PersonId, Person>()

  for (const n of notifications) {
    const type = (n.types ?? [])[0]
    if (type === undefined) {
      control.ctx.info('processEmailNotifications: skipping notification without type', { notificationId: n._id })
      continue
    }
    let message: ActivityMessage | undefined
    if (hierarchy.isDerived(n._class, notification.class.ActivityInboxNotification)) {
      const activityNotification = n as ActivityInboxNotification
      message = messages.find((m) => m._id === activityNotification.attachedTo)
    } else if (hierarchy.isDerived(n._class, notification.class.MentionInboxNotification)) {
      const mentionNotification = n as MentionInboxNotification
      if (hierarchy.isDerived(mentionNotification.mentionedInClass, activity.class.ActivityMessage)) {
        message = messages.find((m) => m._id === mentionNotification.mentionedIn)
      }
    } else if (hierarchy.isDerived(n._class, notification.class.CommonInboxNotification)) {
      message = undefined
    }

    if (message === undefined && !hierarchy.isDerived(n._class, notification.class.CommonInboxNotification)) {
      control.ctx.info('processEmailNotifications: skipping - no ActivityMessage and not CommonInboxNotification', {
        notificationId: n._id,
        notificationClass: n._class
      })
      continue
    }
    const employee = await getEmployeeByAcc(control, n.user)
    if (employee === undefined) {
      control.ctx.info('processEmailNotifications: no employee for user', { notificationId: n._id, user: n.user })
      continue
    }
    const emailQuery = {
      attachedTo: employee._id,
      type: { $in: [SocialIdType.EMAIL, SocialIdType.GOOGLE] },
      verifiedOn: { $gt: 0 },
      isDeleted: { $ne: true }
    }

    let emails: SocialIdentity[] = []
    try {
      // Use rawFindAll to avoid filters from permission middleware
      emails = await control.lowLevel.rawFindAll<SocialIdentity>('channel' as Domain, emailQuery, { limit: 10 })
    } catch (err) {
      // Fallback to regular findAll if lowLevel fails
      control.ctx.warn('processEmailNotifications: Raw find all failed', { employeeId: employee._id, err })
      const emailsResult = await control.findAll(control.ctx, contact.class.SocialIdentity, emailQuery)
      emails = emailsResult as SocialIdentity[]
    }

    if (emails.length === 0) {
      control.ctx.warn('processEmailNotifications: No verified email found for employee', {
        notificationId: n._id,
        user: n.user,
        employeeId: employee._id
      })
      continue
    }

    const senderSocialId = message !== undefined ? (message.createdBy ?? message.modifiedBy) : core.account.System
    const sender = senders.get(senderSocialId) ?? (await getPerson(control, senderSocialId))
    if (sender != null) {
      senders.set(senderSocialId, sender)
    }

    control.ctx.info('processEmailNotifications: sending email', {
      notificationId: n._id,
      type,
      notificationClass: n._class
    })
    await notifyByEmail(control, type, doc, sender, senderSocialId, emails[0].value, n, message)
  }
}

function hasEmailProvider (n: InboxNotification, availableProviders: AvailableProvidersCache): boolean {
  const providers = availableProviders.get(n._id) ?? availableProviders.get(n.objectId as Ref<InboxNotification>)
  return providers?.find((p) => p === gmail.providers.EmailNotificationProvider) !== undefined
}

async function NotificationsHandler (txes: TxCreateDoc<InboxNotification>[], control: TriggerControl): Promise<Tx[]> {
  control.ctx.info('NotificationsHandler: received InboxNotification txes', {
    count: txes.length,
    workspace: control.workspace?.url,
    objectClasses: [...new Set(txes.map((tx) => tx.objectClass))]
  })

  const availableProviders: AvailableProvidersCache = control.contextCache.get(AvailableProvidersCacheKey) ?? new Map()

  const all: InboxNotification[] = txes.map((tx) => TxProcessor.createDoc2Doc(tx))

  const notificationsWithEmail = all.filter((it) => hasEmailProvider(it, availableProviders))

  control.ctx.info('NotificationsHandler: processing inbox notifications', {
    total: all.length,
    withEmailFromCache: notificationsWithEmail.length,
    notificationClasses: [...new Set(all.map((n) => n._class))],
    notificationTypes: [...new Set(all.flatMap((n) => n.types ?? []))]
  })

  if (notificationsWithEmail.length < all.length) {
    const notificationControl = await getNotificationProviderControl(control.ctx, control)
    const receivers = await getReceiversInfo(control.ctx, [...new Set(all.map((n) => n.user))], control)
    const receiverByAccount = new Map(receivers.map((r) => [r.account, r]))
    for (const n of all) {
      if (hasEmailProvider(n, availableProviders)) continue
      const type = (n.types ?? [])[0]
      if (type === undefined) {
        control.ctx.info('NotificationsHandler: skipping notification without type', { notificationId: n._id })
        continue
      }
      const notificationType = control.modelDb.getObject(type)
      const receiver = receiverByAccount.get(n.user)
      if (receiver === undefined) {
        control.ctx.info('NotificationsHandler: no receiver info for user', {
          notificationId: n._id,
          type,
          reason: 'user not in getReceiversInfo result'
        })
        continue
      }
      const allowedProviders = getAllowedProviders(control, receiver.socialIds, notificationType, notificationControl)
      if (allowedProviders.includes(gmail.providers.EmailNotificationProvider)) {
        notificationsWithEmail.push(n)
      } else {
        control.ctx.info('NotificationsHandler: email provider not enabled for notification type', {
          notificationId: n._id,
          type
        })
      }
    }
  }

  if (notificationsWithEmail.length === 0) {
    control.ctx.info('NotificationsHandler: no notifications with email provider, skipping')
    return []
  }

  const notificationsByDocId = groupByArray(notificationsWithEmail, (n) => n.objectId)

  await Promise.all(
    Array.from(notificationsByDocId.entries()).map(([docId, notifications]) =>
      processEmailNotifications(control, notifications)
    )
  )

  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnMessageCreate,
    NotificationsHandler
  },
  function: {
    IsIncomingMessageTypeMatch,
    FindMessages
  }
})
