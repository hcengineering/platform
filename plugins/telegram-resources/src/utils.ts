//
// Copyright © 2023 Hardcore Engineering Inc.
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

import contact, { type Employee, type PersonAccount } from '@hcengineering/contact'
import { employeeByIdStore, getContactChannel } from '@hcengineering/contact-resources'
import core, { type Ref, getCurrentAccount, type Doc, type WithLookup } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import setting from '@hcengineering/setting'
import { type TemplateDataProvider } from '@hcengineering/templates'
import { get } from 'svelte/store'
import { type TelegramChatMessage, type TelegramChannelMessage, TelegramMessageStatus } from '@hcengineering/telegram'
import { type CreateExternalMessageFn, type DirectMessage, type EditExternalMessageFn } from '@hcengineering/chunter'

import telegram from './plugin'

export async function getCurrentEmployeeTG (): Promise<string | undefined> {
  const me = getCurrentAccount() as PersonAccount
  const client = getClient()
  const employee = await client.findOne(contact.mixin.Employee, { _id: me.person as unknown as Ref<Employee> })
  if (employee !== undefined) {
    return await getContactChannel(employee, contact.channelProvider.Telegram)
  }
}

export async function getIntegrationOwnerTG (provider: TemplateDataProvider): Promise<string | undefined> {
  const value = provider.get(setting.class.Integration)
  if (value === undefined) return
  const client = getClient()
  const employeeAccount = await client.findOne(contact.class.PersonAccount, {
    _id: value.modifiedBy as Ref<PersonAccount>
  })
  if (employeeAccount !== undefined) {
    const employee = get(employeeByIdStore).get(employeeAccount.person as Ref<Employee>)
    if (employee !== undefined) {
      return await getContactChannel(employee, contact.channelProvider.Telegram)
    }
  }
}

export const createMessage: CreateExternalMessageFn = async (client, object: Doc, channel, data) => {
  const { _id, message, attachments, collection } = data
  const direct = object as DirectMessage

  const channelMessageId = await client.addCollection<Doc, TelegramChannelMessage>(
    telegram.class.TelegramChannelMessage,
    core.space.Workspace,
    channel._id,
    channel._class,
    'items',
    {
      content: message,
      status: TelegramMessageStatus.New,
      attachments,
      history: false
    },
    _id as any
  )

  if (channelMessageId === undefined) {
    return
  }

  await client.addCollection<Doc, TelegramChatMessage>(
    telegram.class.TelegramChatMessage,
    direct._id,
    direct._id,
    direct._class,
    collection,
    {
      channelId: channel._id,
      channelClass: channel._class,
      channelMessage: channelMessageId,
      channelMessageClass: telegram.class.TelegramChannelMessage,
      message: ''
    }
  )
}

export const editMessage: EditExternalMessageFn = async (client, chatMessage, _, data) => {
  const message = chatMessage as WithLookup<TelegramChatMessage>
  const channelMessage =
    (message.$lookup?.channelMessage as TelegramChannelMessage) ??
    (await client.findOne<TelegramChannelMessage>(telegram.class.TelegramChannelMessage, {
      _id: message.channelMessage as Ref<TelegramChannelMessage>
    }))

  if (channelMessage === undefined) {
    return
  }

  await client.update(channelMessage, { content: data.message, attachments: data.attachments, editedOn: Date.now() })
}

export function canGroupMessages (
  msg1: WithLookup<TelegramChatMessage>,
  msg2: WithLookup<TelegramChatMessage>
): boolean {
  const channelMsg1 = msg1.$lookup?.channelMessage as TelegramChannelMessage
  const channelMsg2 = msg2.$lookup?.channelMessage as TelegramChannelMessage

  return channelMsg1?.status === channelMsg2?.status
}
