//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import { encode } from 'jwt-simple'
import {
  type PersonId,
  type Ref,
  type TxOperations,
  generateId,
  RateLimiter,
  SocialIdType,
  systemAccountUuid
} from '@hcengineering/core'
import { getClient as getAccountClient } from '@hcengineering/account-client'
import { createRestTxOperations } from '@hcengineering/api-client'
import { type Card } from '@hcengineering/card'
import chunter from '@hcengineering/chunter'
import contact, { PersonSpace } from '@hcengineering/contact'
import mail from '@hcengineering/mail'
import config from './config'
import { ensureGlobalPerson } from './person'

function generateToken (): string {
  return encode(
    {
      account: systemAccountUuid,
      extra: { service: 'mail' }
    },
    config.secret
  )
}

export async function createMessages (
  mailId: string,
  from: { address: string, name: string },
  tos: { address: string, name: string }[],
  subject: string,
  content: string,
  inReplyTo?: string
): Promise<void> {
  console.log(`[${mailId}] Sending message ${from.address} --> ${tos.map((to) => to.address).join(',')}`)

  const accountClient = getAccountClient(config.accountsUrl, generateToken())
  const wsInfo = await accountClient.selectWorkspace(config.workspaceUrl)
  const transactorUrl = wsInfo.endpoint.replace('ws://', 'http://').replace('wss://', 'https://')
  const client = await createRestTxOperations(transactorUrl, wsInfo.workspace, wsInfo.token)

  const fromPersonId = await ensureGlobalPerson(accountClient, mailId, from)
  if (fromPersonId === undefined) {
    console.error(`[${mailId}] Unable to create message without a proper FROM`)
    return
  }

  const toPersons: { address: string, socialId: PersonId }[] = []
  for (const to of tos) {
    const toPersonId = await ensureGlobalPerson(accountClient, mailId, to)
    if (toPersonId === undefined) {
      continue
    }
    toPersons.push({ address: to.address, socialId: toPersonId })
  }
  if (toPersons.length === 0) {
    console.error(`[${mailId}] Unable to create message without a proper TO`)
    return
  }

  const modifiedBy = fromPersonId
  const participants = [fromPersonId, ...toPersons.map((p) => p.socialId)]

  try {
    const spaces = await getPersonSpaces(client, mailId, fromPersonId, from.address)
    if (spaces.length > 0) {
      await saveMessageToSpaces(client, mailId, spaces, participants, modifiedBy, subject, content, inReplyTo)
    }
  } catch (err) {
    console.error(`[${mailId}] Failed to save message to personal spaces of ${fromPersonId} (${from.address})`, err)
  }

  for (const to of toPersons) {
    try {
      const spaces = await getPersonSpaces(client, mailId, to.socialId, to.address)
      if (spaces.length > 0) {
        await saveMessageToSpaces(client, mailId, spaces, participants, modifiedBy, subject, content, inReplyTo)
      }
    } catch (err) {
      console.error(`[${mailId}] Failed to save message spaces of ${to.socialId} (${to.address})`, err)
    }
  }
}

async function getPersonSpaces (
  client: TxOperations,
  mailId: string,
  personId: PersonId,
  email: string
): Promise<PersonSpace[]> {
  const socialIdents = await client.findAll(contact.class.SocialIdentity, { type: SocialIdType.EMAIL, value: email })
  const personRefs = socialIdents.map((socialId) => socialId.attachedTo)
  const spaces = await client.findAll(contact.class.PersonSpace, { person: { $in: personRefs } })
  if (spaces.length === 0) {
    console.log(`[${mailId}] No personal space found for ${personId} (${email}), skip`)
  }
  return spaces
}

async function saveMessageToSpaces (
  client: TxOperations,
  mailId: string,
  spaces: PersonSpace[],
  participants: PersonId[],
  modifiedBy: PersonId,
  subject: string,
  content: string,
  inReplyTo?: string
): Promise<void> {
  const rateLimiter = new RateLimiter(10)
  for (const space of spaces) {
    await rateLimiter.add(async () => {
      console.log(`[${mailId}] Saving message to space ${space._id}`)

      const route = await client.findOne(mail.class.MailRoute, { mailId })
      if (route !== undefined) {
        console.log(`[${mailId}] Message is already in the thread ${route.threadId}, skip`)
        return
      }

      let threadId: Ref<Card> | undefined
      if (inReplyTo !== undefined) {
        const route = await client.findOne(mail.class.MailRoute, { mailId: inReplyTo })
        if (route !== undefined) {
          threadId = route.threadId as Ref<Card>
          console.log(`[${mailId}] Found existing thread ${threadId}`)
        }
      }
      if (threadId === undefined) {
        const newThreadId = await client.createDoc(
          mail.class.MailThread,
          space._id,
          {
            title: subject,
            description: content,
            private: true,
            members: participants,
            archived: false,
            createdBy: modifiedBy,
            modifiedBy
          },
          generateId(),
          undefined,
          modifiedBy
        )
        threadId = newThreadId as Ref<Card>
        console.log(`[${mailId}] Created new thread ${threadId}`)
      }

      await client.addCollection(
        chunter.class.ChatMessage,
        space._id,
        threadId,
        mail.class.MailThread,
        'messages',
        { message: content },
        generateId(),
        undefined,
        modifiedBy
      )

      await client.createDoc(
        mail.class.MailRoute,
        space._id,
        {
          mailId,
          threadId
        },
        generateId(),
        undefined,
        modifiedBy
      )
    })
  }
  await rateLimiter.waitProcessing()
}
