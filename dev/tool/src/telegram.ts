//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { DOMAIN_TX, Ref, WorkspaceId } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { DOMAIN_ATTACHMENT } from '@hcengineering/model-attachment'
import contact, { DOMAIN_CHANNEL } from '@hcengineering/model-contact'
import { DOMAIN_TELEGRAM } from '@hcengineering/model-telegram'
import { getWorkspaceDB } from '@hcengineering/mongo'
import telegram, { SharedTelegramMessage, SharedTelegramMessages } from '@hcengineering/telegram'
import { Document, MongoClient, UpdateFilter } from 'mongodb'

const LastMessages = 'last-msgs'

/**
 * @public
 */
export async function clearTelegramHistory (
  mongoUrl: string,
  workspaceId: WorkspaceId,
  tgDb: string,
  minio: MinioService
): Promise<void> {
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const workspaceDB = getWorkspaceDB(client, workspaceId)
    const telegramDB = client.db(tgDb)

    const sharedMessages = await workspaceDB
      .collection(DOMAIN_TELEGRAM)
      .find<SharedTelegramMessages>({
      _class: telegram.class.SharedMessages
    })
      .toArray()
    const sharedIds: Ref<SharedTelegramMessage>[] = []
    for (const sharedMessage of sharedMessages) {
      for (const message of sharedMessage.messages) {
        sharedIds.push(message._id)
      }
    }
    const files = await workspaceDB
      .collection(DOMAIN_ATTACHMENT)
      .find(
        {
          attachedToClass: telegram.class.Message,
          attachedTo: { $nin: sharedIds }
        },
        {
          projection: {
            file: 1
          }
        }
      )
      .toArray()

    const attachments = files.map((file) => file.file)

    console.log('clearing txes and messages...')
    await Promise.all([
      workspaceDB.collection(DOMAIN_TX).deleteMany({
        objectClass: telegram.class.Message
      }),
      workspaceDB.collection(DOMAIN_TELEGRAM).deleteMany({
        _class: telegram.class.Message
      }),
      workspaceDB.collection(DOMAIN_CHANNEL).updateMany(
        {
          provider: contact.channelProvider.Telegram
        },
        {
          $set: {
            items: 0
          }
        } as unknown as UpdateFilter<Document>
      ),
      workspaceDB.collection(DOMAIN_ATTACHMENT).deleteMany({
        attachedToClass: telegram.class.Message
      }),
      minio.remove(workspaceId, Array.from(attachments))
    ])

    console.log('clearing telegram service data...')
    await telegramDB.collection(LastMessages).deleteMany({
      workspace: workspaceId
    })
  } finally {
    await client.close()
  }
}
