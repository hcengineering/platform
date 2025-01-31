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

import contact, { Channel, formatName } from '@hcengineering/contact'
import core, {
  Account,
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
  TxProcessor
} from '@hcengineering/core'
import gmail, { Message } from '@hcengineering/gmail'
import { TriggerControl } from '@hcengineering/server-core'
import { BaseNotificationType, InboxNotification, NotificationType } from '@hcengineering/notification'
import serverNotification, {
  NotificationProviderFunc,
  ReceiverInfo,
  SenderInfo
} from '@hcengineering/server-notification'
import { getContentByTemplate } from '@hcengineering/server-notification-resources'
import { getMetadata } from '@hcengineering/platform'
import { ActivityMessage } from '@hcengineering/activity'
import aiBot from '@hcengineering/ai-bot'

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
  user: Ref<Account>,
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
    const sesURL = getMetadata(serverNotification.metadata.SesUrl)
    if (sesURL === undefined || sesURL === '') {
      ctx.error('Please provide email service url to enable email notifications.')
      return
    }
    const sesAuth: string | undefined = getMetadata(serverNotification.metadata.SesAuthToken)
    await fetch(concatLink(sesURL, '/send'), {
      method: 'post',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(sesAuth != null ? { Authorization: `Bearer ${sesAuth}` } : {})
      },
      body: JSON.stringify({
        text,
        html,
        subject,
        to: [receiver]
      })
    })
  } catch (err) {
    ctx.error('Could not send email notification', { err, receiver })
  }
}

async function notifyByEmail (
  control: TriggerControl,
  type: Ref<BaseNotificationType>,
  doc: Doc | undefined,
  sender: SenderInfo,
  receiver: ReceiverInfo,
  data: InboxNotification,
  message?: ActivityMessage
): Promise<void> {
  const account = receiver.account

  if (account === undefined) {
    return
  }

  const senderPerson = sender.person
  const senderName = senderPerson !== undefined ? formatName(senderPerson.name, control.branding?.lastNameFirst) : ''

  const content = await getContentByTemplate(doc, senderName, type, control, '', data, message)
  if (content !== undefined) {
    await sendEmailNotification(control.ctx, content.text, content.html, content.subject, account.email)
  }
}

const SendEmailNotifications: NotificationProviderFunc = async (
  control: TriggerControl,
  types: BaseNotificationType[],
  object: Doc,
  data: InboxNotification,
  receiver: ReceiverInfo,
  sender: SenderInfo,
  message?: ActivityMessage
): Promise<Tx[]> => {
  if (types.length === 0) {
    return []
  }

  if (
    !receiver.person.active ||
    receiver.account._id === core.account.System ||
    receiver.account._id === aiBot.account.AIBot
  ) {
    return []
  }

  for (const type of types) {
    await notifyByEmail(control, type._id, object, sender, receiver, data, message)
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
    SendEmailNotifications
  }
})
