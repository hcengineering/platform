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

import { MongoClient } from 'mongodb'

import { DOMAIN_TX } from '@anticrm/core'
import { DOMAIN_TELEGRAM } from '@anticrm/model-telegram'
import telegram from '@anticrm/telegram'

const LastMessages = 'last-msgs'

/**
 * @public
 */
export async function clearTelegramHistory (mongoUrl: string, workspace: string, tgDb: string): Promise<void> {
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const workspaceDB = client.db(workspace)
    const telegramDB = client.db(tgDb)

    console.log('clearing txes and messages...')
    await Promise.all([
      workspaceDB.collection(DOMAIN_TX).deleteMany({
        objectClass: telegram.class.Message
      }),
      workspaceDB.collection(DOMAIN_TELEGRAM).deleteMany({
        _class: telegram.class.Message
      })
    ])

    console.log('clearing telegram service data...')
    await telegramDB.collection(LastMessages).deleteMany({
      workspace
    })
  } finally {
    await client.close()
  }
}
