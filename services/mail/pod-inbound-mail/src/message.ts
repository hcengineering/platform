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
import { getClient as getAccountClient } from '@hcengineering/account-client'
import { createRestTxOperations } from '@hcengineering/api-client'
import { type Card } from '@hcengineering/card'
import {
  type RestClient as CommunicationClient,
  createRestClient as getCommunicationClient
} from '@hcengineering/communication-rest-client'
import { type CreateFileEvent, type CreateMessageEvent, RequestEventType } from '@hcengineering/communication-sdk-types'
import { MessageType } from '@hcengineering/communication-types'
import contact, { PersonSpace } from '@hcengineering/contact'
import {
  type Blob,
  type MeasureContext,
  type PersonId,
  type Ref,
  type TxOperations,
  generateId,
  PersonUuid,
  RateLimiter,
  systemAccountUuid
} from '@hcengineering/core'
import mail from '@hcengineering/mail'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { generateToken } from '@hcengineering/server-token'
import config from './config'
import { ensureGlobalPerson, ensureLocalPerson } from './person'

export interface Attachment {
  id: string
  name: string
  data: Buffer
  contentType: string
}

export async function createMessages (
  ctx: MeasureContext,
  mailId: string,
  from: { address: string, name: string },
  tos: { address: string, name: string }[],
  subject: string,
  content: string,
  attachments: Attachment[],
  inReplyTo?: string
): Promise<void> {
  ctx.info('Sending message', { mailId, from: from.address, to: tos.map((to) => to.address).join(',') })

  const token = generateToken(systemAccountUuid, undefined, { service: 'mail' })
  const accountClient = getAccountClient(config.accountsUrl, token)
  const wsInfo = await accountClient.selectWorkspace(config.workspaceUrl)
  const transactorUrl = wsInfo.endpoint.replace('ws://', 'http://').replace('wss://', 'https://')
  const txClient = await createRestTxOperations(transactorUrl, wsInfo.workspace, wsInfo.token)
  const msgClient = getCommunicationClient(wsInfo.endpoint, wsInfo.workspace, wsInfo.token)

  const fromPerson = await ensureGlobalPerson(ctx, accountClient, mailId, from)
  if (fromPerson === undefined) {
    ctx.error('Unable to create message without a proper FROM', { mailId })
    return
  }
  try {
    await ensureLocalPerson(
      ctx,
      txClient,
      mailId,
      fromPerson.uuid,
      fromPerson.socialId,
      from.address,
      fromPerson.firstName,
      fromPerson.lastName
    )
  } catch (error) {
    ctx.error('Failed to ensure local FROM person', { error, mailId })
    ctx.error('Unable to create message without a proper FROM', { mailId })
    return
  }

  const toPersons: { address: string, uuid: PersonUuid, socialId: PersonId }[] = []
  for (const to of tos) {
    const toPerson = await ensureGlobalPerson(ctx, accountClient, mailId, to)
    if (toPerson === undefined) {
      continue
    }
    try {
      await ensureLocalPerson(
        ctx,
        txClient,
        mailId,
        toPerson.uuid,
        toPerson.socialId,
        to.address,
        toPerson.firstName,
        toPerson.lastName
      )
    } catch (error) {
      ctx.error('Failed to ensure local TO person, skip', { error, mailId })
      continue
    }
    toPersons.push({ address: to.address, ...toPerson })
  }
  if (toPersons.length === 0) {
    ctx.error('Unable to create message without a proper TO', { mailId })
    return
  }

  const modifiedBy = fromPerson.socialId
  const participants = [fromPerson.socialId, ...toPersons.map((p) => p.socialId)]

  const attachedBlobs: Attachment[] = []
  if (config.storageConfig !== undefined) {
    const storageConfig = storageConfigFromEnv(config.storageConfig)
    const storageAdapter = buildStorageFromConfig(storageConfig)
    try {
      for (const a of attachments ?? []) {
        try {
          await storageAdapter.put(
            ctx,
            {
              uuid: wsInfo.workspace,
              url: wsInfo.workspaceUrl,
              dataId: wsInfo.workspaceDataId
            },
            a.id,
            a.data,
            a.contentType
          )
          attachedBlobs.push(a)
          ctx.info('Uploaded attachment', { mailId, blobId: a.id, name: a.name, contentType: a.contentType })
        } catch (error) {
          ctx.error('Failed to upload attachment', { name: a.name, error, mailId })
        }
      }
    } finally {
      await storageAdapter.close()
    }
  }

  try {
    const spaces = await getPersonSpaces(ctx, txClient, mailId, fromPerson.uuid, from.address)
    if (spaces.length > 0) {
      await saveMessageToSpaces(
        ctx,
        txClient,
        msgClient,
        mailId,
        spaces,
        participants,
        modifiedBy,
        subject,
        content,
        attachedBlobs,
        inReplyTo
      )
    }
  } catch (error) {
    ctx.error('Failed to save message to personal spaces', {
      error,
      mailId,
      personUuid: fromPerson.uuid,
      email: from.address
    })
  }

  for (const to of toPersons) {
    try {
      const spaces = await getPersonSpaces(ctx, txClient, mailId, to.uuid, to.address)
      if (spaces.length > 0) {
        await saveMessageToSpaces(
          ctx,
          txClient,
          msgClient,
          mailId,
          spaces,
          participants,
          modifiedBy,
          subject,
          content,
          attachedBlobs,
          inReplyTo
        )
      }
    } catch (error) {
      ctx.error('Failed to save message spaces', { error, mailId, personUuid: to.uuid, email: to.address })
    }
  }
}

async function getPersonSpaces (
  ctx: MeasureContext,
  client: TxOperations,
  mailId: string,
  personUuid: PersonUuid,
  email: string
): Promise<PersonSpace[]> {
  const persons = await client.findAll(contact.class.Person, { personUuid }, { projection: { _id: 1 } })
  const personRefs = persons.map((p) => p._id)
  const spaces = await client.findAll(contact.class.PersonSpace, { person: { $in: personRefs } })
  if (spaces.length === 0) {
    ctx.info('No personal space found, skip', { mailId, personUuid, email })
  }
  return spaces
}

async function saveMessageToSpaces (
  ctx: MeasureContext,
  client: TxOperations,
  msgClient: CommunicationClient,
  mailId: string,
  spaces: PersonSpace[],
  participants: PersonId[],
  modifiedBy: PersonId,
  subject: string,
  content: string,
  attachments: Attachment[],
  inReplyTo?: string
): Promise<void> {
  const rateLimiter = new RateLimiter(10)
  for (const space of spaces) {
    const spaceId = space._id
    await rateLimiter.add(async () => {
      ctx.info('Saving message to space', { mailId, space: spaceId })

      const route = await client.findOne(mail.class.MailRoute, { mailId, space: spaceId })
      if (route !== undefined) {
        ctx.info('Message is already in the thread, skip', { mailId, threadId: route.threadId, spaceId })
        return
      }

      let threadId: Ref<Card> | undefined
      if (inReplyTo !== undefined) {
        const route = await client.findOne(mail.class.MailRoute, { mailId: inReplyTo, space: spaceId })
        if (route !== undefined) {
          threadId = route.threadId as Ref<Card>
          ctx.info('Found existing thread', { mailId, threadId, spaceId })
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
        ctx.info('Created new thread', { mailId, threadId, spaceId })
      }

      const msgEvent: CreateMessageEvent = {
        type: RequestEventType.CreateMessage,
        messageType: MessageType.Message,
        card: threadId,
        content,
        creator: modifiedBy
      }
      const { id: messageId } = (await msgClient.event(msgEvent)) as any
      ctx.info('Created message', { mailId, messageId, threadId })

      for (const a of attachments) {
        const fileEvent: CreateFileEvent = {
          type: RequestEventType.CreateFile,
          card: threadId,
          message: messageId,
          blobId: a.id as Ref<Blob>,
          fileType: a.contentType,
          filename: a.name,
          size: a.data.length,
          creator: modifiedBy
        }
        await msgClient.event(fileEvent)
      }

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
