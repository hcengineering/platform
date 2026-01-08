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
  AccountUuid,
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
  getContentByTemplate
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
      ctx.error('sendEmailNotification: Email service URL not configured')
      return
    }
    const mailAuth: string | undefined = getMetadata(serverNotification.metadata.MailAuthToken)

    ctx.info('sendEmailNotification: Sending email', {
      receiver,
      subject,
      mailURL,
      hasAuth: mailAuth != null
    })

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
      ctx.error('sendEmailNotification: Failed to send email', {
        receiver,
        subject,
        status: response.status,
        statusText: response.statusText
      })
    } else {
      ctx.info('sendEmailNotification: Email sent successfully', {
        receiver,
        subject
      })
    }
  } catch (err) {
    ctx.error('sendEmailNotification: Exception while sending email', {
      err,
      receiver,
      subject
    })
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
  message: ActivityMessage
): Promise<void> {
  control.ctx.info('notifyByEmail: Preparing email notification', {
    notificationId: data._id,
    notificationUser: data.user,
    type,
    docId: doc._id,
    docClass: doc._class,
    email,
    messageId: message._id,
    senderSocialId
  })

  let senderName = sender !== undefined ? formatName(sender.name, control.branding?.lastNameFirst) : ''
  if (senderName === '' && senderSocialId === core.account.System) {
    senderName = 'System'
  }
  const content = await getContentByTemplate(doc, senderName, type, control, '', data, message)

  if (content !== undefined) {
    await sendEmailNotification(control.ctx, content.text, content.html, content.subject, email)
  } else {
    control.ctx.warn('notifyByEmail: No content generated for email', {
      notificationId: data._id,
      notificationUser: data.user,
      type,
      docId: doc._id,
      email
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
  if (notifications.length === 0) {
    control.ctx.info('processEmailNotifications: No notifications to process')
    return
  }
  const docId = notifications[0].objectId
  const docClass = notifications[0].objectClass

  control.ctx.info('processEmailNotifications: Starting email notification processing', {
    docId,
    docClass,
    notificationCount: notifications.length
  })

  const doc = (await control.findAll(control.ctx, docClass, { _id: docId }))[0]
  if (doc === undefined) {
    control.ctx.warn('processEmailNotifications: Document not found', {
      docId,
      docClass
    })
    return
  }
  const messages = await getNotificationMessages(notifications, control)
  const { hierarchy } = control

  control.ctx.info('processEmailNotifications: Retrieved activity messages', {
    docId,
    messageCount: messages.length
  })

  const senders = new Map<PersonId, Person>()
  const skipped: Array<{
    notificationId: Ref<InboxNotification>
    user: AccountUuid
    reason: string
    employeeId?: Ref<Employee>
  }> = []
  let sentCount = 0

  for (const n of notifications) {
    const type = (n.types ?? [])[0]
    if (type === undefined) {
      skipped.push({ notificationId: n._id, user: n.user, reason: 'no_notification_type' })
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
    }

    if (message === undefined) {
      skipped.push({ notificationId: n._id, user: n.user, reason: 'activity_message_not_found' })
      continue
    }
    const employee = await getEmployeeByAcc(control, n.user)
    if (employee === undefined) continue
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

    const senderSocialId = message.createdBy ?? message.modifiedBy
    const sender = senders.get(senderSocialId) ?? (await getPerson(control, senderSocialId))
    if (sender != null) {
      senders.set(senderSocialId, sender)
    }

    await notifyByEmail(control, type, doc, sender, senderSocialId, emails[0].value, n, message)
    sentCount++
  }

  control.ctx.info('processEmailNotifications: Completed email notification processing', {
    docId,
    totalNotifications: notifications.length,
    sentCount,
    skippedCount: skipped.length,
    skipped
  })
}

async function NotificationsHandler (txes: TxCreateDoc<InboxNotification>[], control: TriggerControl): Promise<Tx[]> {
  control.ctx.info('NotificationsHandler: Processing email notifications', {
    totalTxes: txes.length
  })

  const availableProviders: AvailableProvidersCache = control.contextCache.get(AvailableProvidersCacheKey) ?? new Map()

  const all: InboxNotification[] = txes
    .map((tx) => TxProcessor.createDoc2Doc(tx))
    .filter(
      (it) => availableProviders.get(it._id)?.find((p) => p === gmail.providers.EmailNotificationProvider) !== undefined
    )

  const filteredOut = txes.length - all.length
  if (filteredOut > 0) {
    control.ctx.info('NotificationsHandler: Filtered out notifications without email provider', {
      filteredOut,
      totalTxes: txes.length,
      remaining: all.length
    })
  }

  if (all.length === 0) {
    control.ctx.info('NotificationsHandler: No notifications with email provider found')
    return []
  }

  const notificationsByDocId = groupByArray(all, (n) => n.objectId)

  control.ctx.info('NotificationsHandler: Grouped notifications by document', {
    totalNotifications: all.length,
    documentCount: notificationsByDocId.size
  })

  await Promise.all(
    Array.from(notificationsByDocId.entries()).map(([docId, notifications]) =>
      processEmailNotifications(control, notifications)
    )
  )

  control.ctx.info('NotificationsHandler: Completed processing all email notifications')

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
