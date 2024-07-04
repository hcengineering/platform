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

import contact, { Channel, ChannelProvider, Contact, Employee, PersonAccount } from '@hcengineering/contact'
import core, {
  Account,
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  Ref,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxProcessor,
  TxRemoveDoc
} from '@hcengineering/core'
import { TriggerControl } from '@hcengineering/server-core'
import telegram, { TelegramChannelMessage, TelegramChatMessage } from '@hcengineering/telegram'
import setting, { Integration } from '@hcengineering/setting'
import chunter, { DirectMessage } from '@hcengineering/chunter'
import { deepEqual } from 'fast-equals'
import type { NotificationType } from '@hcengineering/notification'

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
  return await findAll(telegram.class.TelegramChannelMessage, { channelId: channel._id })
}

/**
 * @public
 */
export async function IsNewMessage (
  originTx: Tx,
  doc: Doc,
  user: Ref<Account>,
  type: NotificationType,
  control: TriggerControl
): Promise<boolean> {
  const tx = TxProcessor.extractTx(originTx) as TxCreateDoc<TelegramChatMessage>

  if (!control.hierarchy.isDerived(tx.objectClass, telegram.class.TelegramChatMessage)) {
    return true
  }

  const message = TxProcessor.createDoc2Doc(tx)

  const channelMessage = (await control.findAll(message.channelMessageClass, { _id: message.channelMessage }))[0] as
    | TelegramChannelMessage
    | undefined

  return channelMessage !== undefined && !channelMessage.history
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

async function OnChannelMessageRemove (
  originTx: TxCollectionCUD<Channel, TelegramChannelMessage>,
  control: TriggerControl
): Promise<Tx[]> {
  const tx = TxProcessor.extractTx(originTx) as TxRemoveDoc<TelegramChannelMessage>

  if (tx._class !== core.class.TxRemoveDoc || tx.objectClass !== telegram.class.TelegramChannelMessage) {
    return []
  }

  const chatMessages = await control.findAll(telegram.class.TelegramChatMessage, { channelMessage: tx.objectId })

  return chatMessages.map((it) => control.txFactory.createTxRemoveDoc(it._class, it.space, it._id))
}

async function OnChannelMessageCreate (
  originTx: TxCollectionCUD<Channel, TelegramChannelMessage>,
  control: TriggerControl
): Promise<Tx[]> {
  const tx = TxProcessor.extractTx(originTx) as TxCreateDoc<TelegramChannelMessage>

  if (tx._class !== core.class.TxCreateDoc || tx.objectClass !== telegram.class.TelegramChannelMessage) {
    return []
  }

  const message = TxProcessor.createDoc2Doc(tx)
  const res: Tx[] = []
  const sender = tx.modifiedBy as Ref<PersonAccount>
  const receiver = message.receiver as Ref<PersonAccount>

  if (receiver === undefined) {
    return []
  }

  const accIds = [sender, receiver].sort()
  const allDirects = await control.findAll(chunter.class.DirectMessage, {})

  let direct: Ref<DirectMessage> | undefined
  for (const dm of allDirects) {
    const members: Ref<Account>[] = dm.members.sort()
    if (deepEqual(members, accIds)) {
      direct = dm._id
      break
    }
  }

  if (direct === undefined) {
    const directTx = control.txFactory.createTxCreateDoc(chunter.class.DirectMessage, core.space.Space, {
      name: '',
      description: '',
      private: true,
      archived: false,
      members: accIds
    })

    direct = directTx.objectId
  }

  const createTx = control.txFactory.createTxCreateDoc<TelegramChatMessage>(
    telegram.class.TelegramChatMessage,
    direct,
    {
      attachedTo: direct,
      attachedToClass: chunter.class.DirectMessage,
      channelId: message.attachedTo,
      channelClass: message.attachedToClass,
      collection: 'messages',
      message: '',
      channelMessage: message._id,
      channelMessageClass: message._class
    },
    undefined,
    message.modifiedOn
  )

  createTx.space = core.space.Tx

  const collectionTx = control.txFactory.createTxCollectionCUD<DirectMessage, TelegramChatMessage>(
    chunter.class.DirectMessage,
    direct,
    core.space.Space,
    'messages',
    createTx
  )

  collectionTx.space = core.space.Tx

  res.push(collectionTx)

  return res
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnChannelMessageRemove,
    OnChannelMessageCreate
  },
  function: {
    IsNewMessage,
    FindMessages,
    GetCurrentEmployeeTG,
    GetIntegrationOwnerTG
  }
})
