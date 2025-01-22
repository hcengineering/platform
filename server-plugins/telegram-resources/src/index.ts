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
import contact, { Channel, ChannelProvider, Contact, Employee, formatName, PersonAccount } from '@hcengineering/contact'
import {
  Account,
  Class,
  concatLink,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  Ref,
  toWorkspaceString,
  Tx,
  TxCreateDoc,
  TxProcessor
} from '@hcengineering/core'
import notification, {
  BaseNotificationType,
  InboxNotification,
  MentionInboxNotification,
  NotificationType
} from '@hcengineering/notification'
import { getMetadata, getResource, translate } from '@hcengineering/platform'
import { TriggerControl } from '@hcengineering/server-core'
import { NotificationProviderFunc, ReceiverInfo, SenderInfo } from '@hcengineering/server-notification'
import {
  getNotificationLink,
  getTextPresenter,
  getTranslatedNotificationContent
} from '@hcengineering/server-notification-resources'
import serverTelegram from '@hcengineering/server-telegram'
import { generateToken } from '@hcengineering/server-token'
import setting, { Integration } from '@hcengineering/setting'
import telegram, { TelegramMessage, TelegramNotificationRequest } from '@hcengineering/telegram'
import { markupToHTML } from '@hcengineering/text-core'

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
  user: Ref<Account>[],
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
  const account = await control.modelDb.findOne(contact.class.PersonAccount, {
    _id: control.txFactory.account as Ref<PersonAccount>
  })
  if (account === undefined) return
  const employee = (
    await control.findAll(control.ctx, contact.mixin.Employee, { _id: account.person as Ref<Employee> })
  )[0]
  if (employee !== undefined) {
    return await getContactChannel(control, employee, contact.channelProvider.Telegram)
  }
}

export async function GetIntegrationOwnerTG (
  control: TriggerControl,
  context: Record<string, Doc>
): Promise<string | undefined> {
  const value = context[setting.class.Integration] as Integration
  if (value === undefined) return
  const account = await control.modelDb.findOne(contact.class.PersonAccount, {
    _id: value.modifiedBy as Ref<PersonAccount>
  })
  if (account === undefined) return
  const employee = (
    await control.findAll(control.ctx, contact.mixin.Employee, { _id: account.person as Ref<Employee> })
  )[0]
  if (employee !== undefined) {
    return await getContactChannel(control, employee, contact.channelProvider.Telegram)
  }
}

async function getContactChannel (
  control: TriggerControl,
  value: Contact,
  provider: Ref<ChannelProvider>
): Promise<string | undefined> {
  if (value === undefined) return
  const res = (
    await control.findAll(control.ctx, contact.class.Channel, {
      attachedTo: value._id,
      provider
    })
  )[0]
  return res?.value ?? ''
}

async function activityMessageToHtml (control: TriggerControl, message: ActivityMessage): Promise<string | undefined> {
  const { hierarchy } = control
  if (hierarchy.isDerived(message._class, chunter.class.ChatMessage)) {
    const chatMessage = message as ChatMessage
    return markupToHTML(chatMessage.message)
  } else {
    const resource = getTextPresenter(message._class, control.hierarchy)

    if (resource !== undefined) {
      const fn = await getResource(resource.presenter)
      const textData = await fn(message, control)
      if (textData !== undefined && textData !== '') {
        return markupToHTML(textData)
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
    body = text !== undefined ? markupToHTML(text) : body
  } else if (data.data !== undefined) {
    body = markupToHTML(data.data)
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

const telegramNotificationKey = 'telegram.notification.reported'
const SendTelegramNotifications: NotificationProviderFunc = async (
  control: TriggerControl,
  types: BaseNotificationType[],
  doc: Doc,
  data: InboxNotification,
  receiver: ReceiverInfo,
  sender: SenderInfo,
  message?: ActivityMessage
): Promise<Tx[]> => {
  if (types.length === 0) {
    return []
  }

  const botUrl = getMetadata(serverTelegram.metadata.BotUrl)

  if (botUrl === undefined || botUrl === '') {
    const reported = control.cache.get(telegramNotificationKey)
    if (reported === undefined) {
      control.ctx.error('Please provide telegram bot service url to enable telegram notifications.')
      control.cache.set(telegramNotificationKey, true)
    }
    return []
  }

  if (!receiver.person.active) {
    return []
  }

  try {
    const { title, body, quote, link } = await getTranslatedData(data, doc, control, message)
    const record: TelegramNotificationRequest = {
      notificationId: data._id,
      messageId: message?._id,
      account: receiver._id,
      workspace: toWorkspaceString(control.workspace),
      sender: data.intlParams?.senderName?.toString() ?? formatName(sender.person?.name ?? 'System'),
      attachments: hasAttachments(message, control.hierarchy),
      title,
      quote,
      body,
      link
    }

    await fetch(concatLink(botUrl, '/notify'), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + generateToken(receiver.account.email, control.workspace),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([record])
    })
  } catch (err) {
    control.ctx.error('Could not send telegram notification', {
      err,
      notificationId: data._id,
      receiver: receiver.account.email
    })
  }

  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnMessageCreate
  },
  function: {
    IsIncomingMessageTypeMatch,
    FindMessages,
    GetCurrentEmployeeTG,
    GetIntegrationOwnerTG,
    SendTelegramNotifications
  }
})
