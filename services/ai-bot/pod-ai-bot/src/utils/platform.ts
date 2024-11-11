//
// Copyright © 2024 Hardcore Engineering Inc.
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

import core, { Account, Client, Ref, TxOperations } from '@hcengineering/core'
import { createClient } from '@hcengineering/server-client'
import contact, { PersonAccount } from '@hcengineering/contact'
import chunter, { DirectMessage } from '@hcengineering/chunter'
import aiBot from '@hcengineering/ai-bot'
import { deepEqual } from 'fast-equals'
import notification from '@hcengineering/notification'

export async function connectPlatform (token: string, endpoint: string): Promise<Client> {
  return await createClient(endpoint, token)
}

export async function getDirect (
  client: TxOperations,
  email: string,
  aiAccount?: PersonAccount
): Promise<Ref<DirectMessage> | undefined> {
  const personAccount = await client.getModel().findOne(contact.class.PersonAccount, { email })

  if (personAccount === undefined) {
    return
  }

  const allAccounts = await client.findAll(contact.class.PersonAccount, { person: personAccount.person })
  const accIds: Ref<Account>[] = [aiBot.account.AIBot, ...allAccounts.map(({ _id }) => _id)].sort()
  const existingDms = await client.findAll(chunter.class.DirectMessage, {})

  for (const dm of existingDms) {
    if (deepEqual(dm.members.sort(), accIds)) {
      return dm._id
    }
  }

  const dmId = await client.createDoc<DirectMessage>(chunter.class.DirectMessage, core.space.Space, {
    name: '',
    description: '',
    private: true,
    archived: false,
    members: accIds
  })

  if (aiAccount === undefined) return dmId
  const space = await client.findOne(contact.class.PersonSpace, { person: aiAccount.person })
  if (space === undefined) return dmId
  await client.createDoc(notification.class.DocNotifyContext, space._id, {
    user: aiBot.account.AIBot,
    objectId: dmId,
    objectClass: chunter.class.DirectMessage,
    objectSpace: core.space.Space,
    isPinned: false,
    hidden: false
  })

  return dmId
}
