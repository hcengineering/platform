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

import contact, { Channel } from '@hcengineering/contact'
import {
  Account,
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  Ref,
  Tx,
  TxCUD,
  TxCreateDoc,
  TxProcessor
} from '@hcengineering/core'
import gmail, { Message } from '@hcengineering/gmail'
import { TriggerControl } from '@hcengineering/server-core'
import notification, { NotificationType } from '@hcengineering/notification'

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
  const res: Tx[] = []

  const createTx = tx as TxCreateDoc<Message>

  const message = TxProcessor.createDoc2Doc<Message>(createTx)

  const channel = (await control.findAll(contact.class.Channel, { _id: message.attachedTo }, { limit: 1 }))[0]
  if (channel !== undefined) {
    if (channel.lastMessage === undefined || channel.lastMessage < message.sendOn) {
      const tx = control.txFactory.createTxUpdateDoc(channel._class, channel.space, channel._id, {
        lastMessage: message.sendOn
      })
      res.push(tx)
    }
    if (message.incoming) {
      const docs = await control.findAll(notification.class.DocUpdates, {
        attachedTo: channel._id,
        user: message.modifiedBy
      })
      for (const doc of docs) {
        res.push(
          control.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, {
            $push: {
              txes: {
                _id: tx._id as Ref<TxCUD<Doc>>,
                modifiedOn: tx.modifiedOn,
                modifiedBy: tx.modifiedBy,
                isNew: true
              }
            }
          })
        )
        res.push(
          control.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, {
            lastTxTime: tx.modifiedOn,
            hidden: false
          })
        )
      }
      if (docs.length === 0) {
        res.push(
          control.txFactory.createTxCreateDoc(notification.class.DocUpdates, channel.space, {
            user: tx.modifiedBy,
            attachedTo: channel._id,
            attachedToClass: channel._class,
            hidden: false,
            lastTxTime: tx.modifiedOn,
            txes: [
              { _id: tx._id as Ref<TxCUD<Doc>>, modifiedOn: tx.modifiedOn, modifiedBy: tx.modifiedBy, isNew: true }
            ]
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
  const message = TxProcessor.createDoc2Doc(TxProcessor.extractTx(tx) as TxCreateDoc<Message>)
  return message.incoming && message.sendOn > (doc.createdOn ?? doc.modifiedOn)
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnMessageCreate
  },
  function: {
    IsIncomingMessage,
    FindMessages
  }
})
