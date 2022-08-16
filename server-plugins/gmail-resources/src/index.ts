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

import contact, { Channel } from '@anticrm/contact'
import core, {
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  Ref,
  Tx,
  TxCreateDoc,
  TxProcessor
} from '@anticrm/core'
import gmail, { Message } from '@anticrm/gmail'
import { TriggerControl } from '@anticrm/server-core'

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
export async function OnMessageCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx)
  if (actualTx._class !== core.class.TxCreateDoc) {
    return []
  }

  const createTx = tx as TxCreateDoc<Message>

  if (!control.hierarchy.isDerived(createTx.objectClass, gmail.class.Message)) {
    return []
  }
  const message = TxProcessor.createDoc2Doc<Message>(createTx)

  const channel = (await control.findAll(contact.class.Channel, { _id: message.attachedTo }, { limit: 1 }))[0]
  if (channel === undefined) {
    return []
  }
  if (channel.lastMessage === undefined || channel.lastMessage < message.sendOn) {
    const tx = control.txFactory.createTxUpdateDoc(channel._class, channel.space, channel._id, {
      lastMessage: message.sendOn
    })
    return [tx]
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnMessageCreate
  },
  function: {
    FindMessages
  }
})
