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
import activity, { ActivityMessage, DocUpdateMessage } from '@hcengineering/activity'
import chunter, { ChatMessage } from '@hcengineering/chunter'
import contact, { Channel, Person } from '@hcengineering/contact'
import core, {
  PersonId,
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  Ref,
  Tx,
  TxCreateDoc,
  TxProcessor,
  TxCUD,
  TxUpdateDoc
} from '@hcengineering/core'
import notification, {
  ActivityInboxNotification,
  InboxNotification,
  MentionInboxNotification,
  NotificationProviderSetting,
  NotificationType
} from '@hcengineering/notification'
import { getResource, translate } from '@hcengineering/platform'
import { getAccountBySocialId, getPerson } from '@hcengineering/server-contact'
import { PlatformQueueProducer, QueueTopic, TriggerControl } from '@hcengineering/server-core'
import {
  getNotificationLink,
  getTextPresenter,
  getTranslatedNotificationContent,
  AvailableProvidersCache,
  AvailableProvidersCacheKey
} from '@hcengineering/server-notification-resources'
import {
  type TelegramNotificationQueueMessage,
  TelegramQueueMessageType,
  TelegramQueueMessage
} from '@hcengineering/server-telegram'
import telegram, { TelegramMessage } from '@hcengineering/telegram'
import { jsonToHTML, markupToJSON } from '@hcengineering/text'

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
  if (channel.provider !== contact.channelProvider.Telegram) {
    return []
  }
  const messages = await findAll(telegram.class.Message, { attachedTo: channel._id })
  const newMessages = await findAll(telegram.class.NewMessage, { attachedTo: channel._id })
  return [...messages, ...newMessages]
}

/**
 * @public
 */
export async function OnMessageCreate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const message = TxProcessor.createDoc2Doc<TelegramMessage>(tx as TxCreateDoc<TelegramMessage>)
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
  const message = TxProcessor.createDoc2Doc(tx as TxCreateDoc<TelegramMessage>)
  return message.incoming && message.sendOn > (doc.createdOn ?? doc.modifiedOn)
}

export async function GetCurrentEmployeeTG (
  control: TriggerControl,
  context: Record<string, Doc>
): Promise<string | undefined> {
  // TODO: FIXME
  // const account = await control.modelDb.findOne(contact.class.PersonAccount, {
  //   _id: control.txFactory.account as PersonId
  // })
  // if (account === undefined) return
  // const employee = (
  //   await control.findAll(control.ctx, contact.mixin.Employee, { _id: account.person as Ref<Employee> })
  // )[0]
  // if (employee !== undefined) {
  //   return await getContactChannel(control, employee, contact.channelProvider.Telegram)
  // }

  return undefined
}

export async function GetIntegrationOwnerTG (
  control: TriggerControl,
  context: Record<string, Doc>
): Promise<string | undefined> {
  // TODO: FIXME
  // const value = context[setting.class.Integration] as Integration
  // if (value === undefined) return
  // const account = await control.modelDb.findOne(contact.class.PersonAccount, {
  //   _id: value.modifiedBy as PersonId
  // })
  // if (account === undefined) return
  // const employee = (
  //   await control.findAll(control.ctx, contact.mixin.Employee, { _id: account.person as Ref<Employee> })
  // )[0]
  // if (employee !== undefined) {
  //   return await getContactChannel(control, employee, contact.channelProvider.Telegram)
  // }

  return undefined
}

// async function getContactChannel (
//   control: TriggerControl,
//   value: Contact,
//   provider: Ref<ChannelProvider>
// ): Promise<string | undefined> {
//   if (value === undefined) return
//   const res = (
//     await control.findAll(control.ctx, contact.class.Channel, {
//       attachedTo: value._id,
//       provider
//     })
//   )[0]
//   return res?.value ?? ''
// }

async function activityMessageToHtml (control: TriggerControl, message: ActivityMessage): Promise<string | undefined> {
  const { hierarchy } = control
  if (hierarchy.isDerived(message._class, chunter.class.ChatMessage)) {
    const chatMessage = message as ChatMessage
    return jsonToHTML(markupToJSON(chatMessage.message))
  } else {
    const resource = getTextPresenter(message._class, control.hierarchy)

    if (resource !== undefined) {
      const fn = await getResource(resource.presenter)
      const textData = await fn(message, control)
      if (textData !== undefined && textData !== '') {
        return jsonToHTML(markupToJSON(textData))
      }
    }
  }

  return undefined
}

function isReactionMessage (message?: ActivityMessage): boolean {
  return (
    message !== undefined &&
    message._class === activity.class.DocUpdateMessage &&
    (message as DocUpdateMessage).objectClass === activity.class.Reaction
  )
}

async function getTranslatedData (
  data: InboxNotification,
  doc: Doc,
  control: TriggerControl,
  message?: ActivityMessage
): Promise<{
    title: string
    quote: string | undefined
    body: string
    link: string
  }> {
  const { hierarchy } = control

  let { title, body } = await getTranslatedNotificationContent(data, data._class, control)
  let quote: string | undefined

  if (hierarchy.isDerived(data._class, notification.class.MentionInboxNotification)) {
    const text = (data as MentionInboxNotification).messageHtml
    body = text !== undefined ? jsonToHTML(markupToJSON(text)) : body
  } else if (data.data !== undefined) {
    body = jsonToHTML(markupToJSON(data.data))
  } else if (message !== undefined) {
    const html = await activityMessageToHtml(control, message)
    if (html !== undefined) {
      body = html
    }
  }

  if (hierarchy.isDerived(doc._class, activity.class.ActivityMessage)) {
    const html = await activityMessageToHtml(control, doc as ActivityMessage)
    if (html !== undefined) {
      quote = html
    }
  }

  if (isReactionMessage(message)) {
    title = await translate(activity.string.Reacted, {})
  }

  return {
    title,
    quote,
    body,
    link: await getNotificationLink(control, doc, message?._id)
  }
}

function hasAttachments (doc: ActivityMessage | undefined, hierarchy: Hierarchy): boolean {
  if (doc === undefined) {
    return false
  }

  if (hierarchy.isDerived(doc._class, chunter.class.ChatMessage)) {
    const chatMessage = doc as ChatMessage
    return (chatMessage.attachments ?? 0) > 0
  }

  return false
}

const telegramNotificationCacheKey = 'telegram.notification.cache'

async function NotificationsHandler (txes: TxCreateDoc<InboxNotification>[], control: TriggerControl): Promise<Tx[]> {
  const queue = control.queue

  if (queue === undefined) {
    return []
  }

  const availableProviders: AvailableProvidersCache = control.contextCache.get(AvailableProvidersCacheKey) ?? new Map()

  const all: InboxNotification[] = txes
    .map((tx) => TxProcessor.createDoc2Doc(tx))
    .filter(
      (it) =>
        availableProviders.get(it._id)?.find((p) => p === telegram.providers.TelegramNotificationProvider) !== undefined
    )

  if (all.length === 0) {
    return []
  }

  const result: Tx[] = []
  const producer = queue.createProducer(control.ctx, QueueTopic.TelegramBot)
  try {
    for (const inboxNotification of all) {
      result.push(...(await processNotification(inboxNotification, control, producer)))
    }
  } finally {
    await producer.close()
  }
  return result
}

async function getNotificationMessage (
  n: InboxNotification,
  control: TriggerControl,
  cache: Map<Ref<Doc>, Doc>
): Promise<ActivityMessage | undefined> {
  const { hierarchy } = control
  if (hierarchy.isDerived(n._class, notification.class.ActivityInboxNotification)) {
    const activityNotification = n as ActivityInboxNotification
    const message =
      cache.get(activityNotification.attachedTo) ??
      (
        await control.findAll(control.ctx, activityNotification.attachedToClass, {
          _id: activityNotification.attachedTo
        })
      )[0]
    return message as ActivityMessage
  } else if (hierarchy.isDerived(n._class, notification.class.MentionInboxNotification)) {
    const mentionNotification = n as MentionInboxNotification
    if (hierarchy.isDerived(mentionNotification.mentionedInClass, activity.class.ActivityMessage)) {
      const message =
        cache.get(mentionNotification.mentionedIn) ??
        (
          await control.findAll(control.ctx, mentionNotification.mentionedInClass, {
            _id: mentionNotification.mentionedIn
          })
        )[0]
      return message as ActivityMessage
    }
  }

  return undefined
}

async function getSenderName (n: InboxNotification, control: TriggerControl): Promise<string> {
  const inlineName = n.intlParams?.senderName
  if (inlineName != null && inlineName !== '') {
    return inlineName.toString()
  }
  const senderPerson = await getPerson(control, n.createdBy ?? n.modifiedBy)
  return senderPerson?.name ?? 'System'
}

async function processNotification (
  n: InboxNotification,
  control: TriggerControl,
  producer: PlatformQueueProducer<TelegramQueueMessage>
): Promise<Tx[]> {
  try {
    const cache: Map<Ref<Doc>, Doc> = control.contextCache.get(telegramNotificationCacheKey) ?? new Map()
    const doc = cache.get(n.objectId) ?? (await control.findAll(control.ctx, n.objectClass, { _id: n.objectId }))[0]
    if (doc === undefined) return []
    const message = await getNotificationMessage(n, control, cache)

    cache.set(n.objectId, doc)
    control.contextCache.set(telegramNotificationCacheKey, cache)

    const { title, body, quote, link } = await getTranslatedData(n, doc, control, message)
    const record: TelegramNotificationQueueMessage = {
      type: TelegramQueueMessageType.Notification,
      notificationId: n._id,
      messageId: message?._id,
      account: n.user,
      sender: await getSenderName(n, control),
      attachments: hasAttachments(message, control.hierarchy),
      title,
      quote,
      body,
      link
    }

    await producer.send(control.workspace.uuid, [record])
  } catch (err) {
    control.ctx.error('Could not send telegram notification', {
      err,
      notificationId: n._id,
      account: n.user
    })
  }

  return []
}

async function updateWorkspaceSubscription (
  producer: PlatformQueueProducer<TelegramQueueMessage>,
  enabled: boolean,
  socialId: PersonId,
  control: TriggerControl
): Promise<void> {
  const account = await getAccountBySocialId(control, socialId)
  if (account == null) {
    return
  }
  await producer.send(control.workspace.uuid, [
    {
      type: TelegramQueueMessageType.WorkspaceSubscription,
      account,
      subscribe: enabled
    }
  ])
}

async function ProviderSettingsHandler (
  txes: TxCUD<NotificationProviderSetting>[],
  control: TriggerControl
): Promise<Tx[]> {
  const queue = control.queue

  if (queue === undefined) {
    return []
  }

  const producer = queue.createProducer(control.ctx, QueueTopic.TelegramBot)

  try {
    for (const tx of txes) {
      if (tx._class === core.class.TxCreateDoc) {
        const createTx = tx as TxCreateDoc<NotificationProviderSetting>
        const setting = TxProcessor.createDoc2Doc(createTx)

        if (setting.attachedTo === telegram.providers.TelegramNotificationProvider) {
          await updateWorkspaceSubscription(producer, setting.enabled, setting.createdBy ?? setting.modifiedBy, control)
        }
      } else if (tx._class === core.class.TxUpdateDoc) {
        const updateTx = tx as TxUpdateDoc<NotificationProviderSetting>
        if (updateTx.operations.enabled !== undefined) {
          const setting = (
            await control.findAll(control.ctx, notification.class.NotificationProviderSetting, {
              _id: updateTx.objectId
            })
          )[0]

          if (setting !== undefined && setting.attachedTo === telegram.providers.TelegramNotificationProvider) {
            await updateWorkspaceSubscription(
              producer,
              updateTx.operations.enabled,
              setting.createdBy ?? setting.modifiedBy,
              control
            )
          }
        }
      }
    }
  } finally {
    await producer.close()
  }

  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnMessageCreate,
    NotificationsHandler,
    ProviderSettingsHandler
  },
  function: {
    IsIncomingMessageTypeMatch,
    FindMessages,
    GetCurrentEmployeeTG,
    GetIntegrationOwnerTG
  }
})
