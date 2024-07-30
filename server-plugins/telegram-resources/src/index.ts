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
import { TriggerControl } from '@hcengineering/server-core'
import telegram, { TelegramMessage, TelegramNotificationRecord } from '@hcengineering/telegram'
import notification, { BaseNotificationType, InboxNotification, NotificationType } from '@hcengineering/notification'
import setting, { Integration } from '@hcengineering/setting'
import { NotificationProviderFunc, UserInfo } from '@hcengineering/server-notification'
import { getMetadata, getResource } from '@hcengineering/platform'
import serverTelegram from '@hcengineering/server-telegram'
import { getTranslatedNotificationContent, getTextPresenter } from '@hcengineering/server-notification-resources'
import { generateToken } from '@hcengineering/server-token'
import chunter, { ChatMessage } from '@hcengineering/chunter'
import { markupToHTML } from '@hcengineering/text'
import activity from '@hcengineering/activity'

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
export async function OnMessageCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []

  const message = TxProcessor.createDoc2Doc<TelegramMessage>(tx as TxCreateDoc<TelegramMessage>)
  const channel = (await control.findAll(contact.class.Channel, { _id: message.attachedTo }, { limit: 1 }))[0]
  if (channel !== undefined) {
    if (channel.lastMessage === undefined || channel.lastMessage < message.sendOn) {
      const tx = control.txFactory.createTxUpdateDoc(channel._class, channel.space, channel._id, {
        lastMessage: message.sendOn
      })
      res.push(tx)
    }

    if (message.incoming) {
      const docs = await control.findAll(notification.class.DocNotifyContext, {
        attachedTo: channel._id,
        user: message.modifiedBy
      })
      for (const doc of docs) {
        // TODO: push inbox notifications
        // res.push(
        //   control.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, {
        //     $push: {
        //       txes: {
        //         _id: tx._id as Ref<TxCUD<Doc>>,
        //         modifiedOn: tx.modifiedOn,
        //         modifiedBy: tx.modifiedBy,
        //         isNew: true
        //       }
        //     }
        //   })
        // )
        res.push(
          control.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, {
            lastUpdateTimestamp: tx.modifiedOn
          })
        )
      }
      if (docs.length === 0) {
        res.push(
          control.txFactory.createTxCreateDoc(notification.class.DocNotifyContext, channel.space, {
            user: tx.modifiedBy,
            attachedTo: channel._id,
            attachedToClass: channel._class,
            lastUpdateTimestamp: tx.modifiedOn
            // TODO: push inbox notifications
            // txes: [
            //   { _id: tx._id as Ref<TxCUD<Doc>>, modifiedOn: tx.modifiedOn, modifiedBy: tx.modifiedBy, isNew: true }
            // ]
          })
        )
      }
    }
  }

  return res
}

/**
 * @public
 */
export async function IsIncomingMessage (
  tx: Tx,
  doc: Doc,
  user: Ref<Account>,
  type: NotificationType,
  control: TriggerControl
): Promise<boolean> {
  const message = TxProcessor.createDoc2Doc(TxProcessor.extractTx(tx) as TxCreateDoc<TelegramMessage>)
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
  const employee = (await control.findAll(contact.mixin.Employee, { _id: account.person as Ref<Employee> }))[0]
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
  const employee = (await control.findAll(contact.mixin.Employee, { _id: account.person as Ref<Employee> }))[0]
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
    await control.findAll(contact.class.Channel, {
      attachedTo: value._id,
      provider
    })
  )[0]
  return res?.value ?? ''
}

async function getTranslatedData (
  data: InboxNotification,
  doc: Doc,
  control: TriggerControl
): Promise<{
    title: string
    quote: string | undefined
    body: string
  }> {
  const { hierarchy } = control

  let { title, body } = await getTranslatedNotificationContent(data, data._class, control)
  let quote: string | undefined

  if (hierarchy.isDerived(doc._class, chunter.class.ChatMessage)) {
    const chatMessage = doc as ChatMessage
    title = ''
    quote = markupToHTML(chatMessage.message)
  } else if (hierarchy.isDerived(doc._class, activity.class.ActivityMessage)) {
    const resource = getTextPresenter(doc._class, control.hierarchy)

    if (resource !== undefined) {
      const fn = await getResource(resource.presenter)
      const textData = await fn(doc, control)
      if (textData !== undefined && textData !== '') {
        title = ''
        quote = markupToHTML(textData)
      }
    }
  }
  body = data.data !== undefined ? `${markupToHTML(data.data)}` : body

  return {
    title,
    quote,
    body
  }
}

const SendTelegramNotifications: NotificationProviderFunc = async (
  control: TriggerControl,
  types: BaseNotificationType[],
  doc: Doc,
  data: InboxNotification,
  receiver: UserInfo,
  sender: UserInfo
): Promise<Tx[]> => {
  if (types.length === 0) {
    return []
  }

  if (receiver.person === undefined || receiver.account?.email === undefined) {
    return []
  }

  const botUrl = getMetadata(serverTelegram.metadata.BotUrl)

  if (botUrl === undefined || botUrl === '') {
    console.log('Please provide telegram bot service url to enable telegram notifications.')
    return []
  }

  const isEmployee = control.hierarchy.hasMixin(receiver.person, contact.mixin.Employee)

  if (!isEmployee) {
    return []
  }

  const employee = control.hierarchy.as(receiver.person, contact.mixin.Employee)

  if (!employee.active) {
    return []
  }

  try {
    const { title, body, quote } = await getTranslatedData(data, doc, control)
    const record: TelegramNotificationRecord = {
      notificationId: data._id,
      account: receiver._id,
      workspace: toWorkspaceString(control.workspace),
      sender: data.intlParams?.senderName?.toString() ?? formatName(sender.person?.name ?? 'System'),
      title,
      quote,
      body
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
    console.log('Could not send telegram notification', err)
  }

  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnMessageCreate
  },
  function: {
    IsIncomingMessage,
    FindMessages,
    GetCurrentEmployeeTG,
    GetIntegrationOwnerTG,
    SendTelegramNotifications
  }
})
