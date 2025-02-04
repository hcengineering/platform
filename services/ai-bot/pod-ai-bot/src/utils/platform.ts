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
import core, { PersonId, Client, Ref, TxOperations } from '@hcengineering/core'
import { createClient } from '@hcengineering/server-client'
import contact, { getAllSocialStringsByPersonId, Person } from '@hcengineering/contact'
import chunter, { DirectMessage } from '@hcengineering/chunter'
import { aiBotEmailSocialId } from '@hcengineering/ai-bot'
import notification from '@hcengineering/notification'

export async function connectPlatform (token: string, endpoint: string): Promise<Client> {
  return await createClient(endpoint, token)
}

export async function getDirect (
  client: TxOperations,
  personId: PersonId,
  aiPerson?: Ref<Person>
): Promise<Ref<DirectMessage> | undefined> {
  const personIds = new Set(await getAllSocialStringsByPersonId(client, personId))

  if (personIds.size === 0) {
    return
  }

  const existingDm = (await client.findAll(chunter.class.DirectMessage, { members: aiBotEmailSocialId })).find((dm) =>
    dm.members.every((m) => m === aiBotEmailSocialId || personIds.has(m))
  )

  if (existingDm !== undefined) {
    return existingDm._id
  }

  const dmId = await client.createDoc<DirectMessage>(chunter.class.DirectMessage, core.space.Space, {
    name: '',
    description: '',
    private: true,
    archived: false,
    members: [aiBotEmailSocialId, personId]
  })

  if (aiPerson === undefined) return dmId

  const space = await client.findOne(contact.class.PersonSpace, { person: aiPerson })
  if (space === undefined) return dmId
  await client.createDoc(notification.class.DocNotifyContext, space._id, {
    user: aiBotEmailSocialId,
    objectId: dmId,
    objectClass: chunter.class.DirectMessage,
    objectSpace: core.space.Space,
    isPinned: false,
    hidden: false
  })

  return dmId
}
