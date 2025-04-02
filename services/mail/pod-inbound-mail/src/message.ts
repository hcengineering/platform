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
  PersonUuid,
  RateLimiter,
  systemAccountUuid
} from '@hcengineering/core'
import { getClient as getAccountClient } from '@hcengineering/account-client'
import {
  type RestClient as CommunicationClient,
  createRestClient as getCommunicationClient
} from '@hcengineering/communication-rest-client'
import { type CreateMessageEvent, RequestEventType } from '@hcengineering/communication-sdk-types'
import { MessageType } from '@hcengineering/communication-types'
import { createRestTxOperations } from '@hcengineering/api-client'
import { type Card } from '@hcengineering/card'
import contact, { PersonSpace } from '@hcengineering/contact'
import mail from '@hcengineering/mail'
import config from './config'
import { ensureGlobalPerson, ensureLocalPerson } from './person'

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
  const txClient = await createRestTxOperations(transactorUrl, wsInfo.workspace, wsInfo.token)
  const msgClient = getCommunicationClient(wsInfo.endpoint, wsInfo.workspace, wsInfo.token)

  const fromPerson = await ensureGlobalPerson(accountClient, mailId, from)
  if (fromPerson === undefined) {
    console.error(`[${mailId}] Unable to create message without a proper FROM`)
    return
  }
  try {
    await ensureLocalPerson(
      txClient,
      mailId,
      fromPerson.uuid,
      fromPerson.socialId,
      from.address,
      fromPerson.firstName,
      fromPerson.lastName
    )
  } catch (err) {
    console.error(`[${mailId}] Failed to ensure local FROM person`, err)
    console.error(`[${mailId}] Unable to create message without a proper FROM`)
    return
  }

  const toPersons: { address: string, uuid: PersonUuid, socialId: PersonId }[] = []
  for (const to of tos) {
    const toPerson = await ensureGlobalPerson(accountClient, mailId, to)
    if (toPerson === undefined) {
      continue
    }
    try {
      await ensureLocalPerson(
        txClient,
        mailId,
        toPerson.uuid,
        toPerson.socialId,
        to.address,
        toPerson.firstName,
        toPerson.lastName
      )
    } catch (err) {
      console.error(`[${mailId}] Failed to ensure local TO person, skip`, err)
      continue
    }
    toPersons.push({ address: to.address, ...toPerson })
  }
  if (toPersons.length === 0) {
    console.error(`[${mailId}] Unable to create message without a proper TO`)
    return
  }

  const modifiedBy = fromPerson.socialId
  const participants = [fromPerson.socialId, ...toPersons.map((p) => p.socialId)]

  try {
    const spaces = await getPersonSpaces(txClient, mailId, fromPerson.uuid, from.address)
    if (spaces.length > 0) {
      await saveMessageToSpaces(
        txClient,
        msgClient,
        mailId,
        spaces,
        participants,
        modifiedBy,
        subject,
        content,
        inReplyTo
      )
    }
  } catch (err) {
    console.error(`[${mailId}] Failed to save message to personal spaces of ${fromPerson.uuid} (${from.address})`, err)
  }

  for (const to of toPersons) {
    try {
      const spaces = await getPersonSpaces(txClient, mailId, to.uuid, to.address)
      if (spaces.length > 0) {
        await saveMessageToSpaces(
          txClient,
          msgClient,
          mailId,
          spaces,
          participants,
          modifiedBy,
          subject,
          content,
          inReplyTo
        )
      }
    } catch (err) {
      console.error(`[${mailId}] Failed to save message spaces of ${to.socialId} (${to.address})`, err)
    }
  }
}

async function getPersonSpaces (
  client: TxOperations,
  mailId: string,
  personUuid: PersonUuid,
  email: string
): Promise<PersonSpace[]> {
  const persons = await client.findAll(contact.class.Person, { personUuid }, { projection: { _id: 1 } })
  const personRefs = persons.map((p) => p._id)
  const spaces = await client.findAll(contact.class.PersonSpace, { person: { $in: personRefs } })
  if (spaces.length === 0) {
    console.log(`[${mailId}] No personal space found for ${personUuid} (${email}), skip`)
  }
  return spaces
}

async function saveMessageToSpaces (
  client: TxOperations,
  msgClient: CommunicationClient,
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

      const event: CreateMessageEvent = {
        type: RequestEventType.CreateMessage,
        messageType: MessageType.Message,
        card: threadId,
        content,
        creator: modifiedBy
      }

      await msgClient.event(event)

      // TODO: process attachments

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
