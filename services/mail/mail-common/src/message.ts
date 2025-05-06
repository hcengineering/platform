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
import { getClient as getAccountClient, isWorkspaceLoginInfo } from '@hcengineering/account-client'
import { createRestTxOperations, createRestClient } from '@hcengineering/api-client'
import { type Card } from '@hcengineering/card'
import {
  type RestClient as CommunicationClient,
  createRestClient as getCommunicationClient
} from '@hcengineering/communication-rest-client'
import { MessageType } from '@hcengineering/communication-types'
import contact, { PersonSpace } from '@hcengineering/contact'
import {
  type Blob,
  type MeasureContext,
  type PersonId,
  type Ref,
  type TxOperations,
  type Doc,
  generateId,
  PersonUuid,
  RateLimiter,
  SocialIdType,
  SocialId
} from '@hcengineering/core'
import mail from '@hcengineering/mail'
import chat from '@hcengineering/chat'

import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'

import { BaseConfig, type Attachment } from './types'
import { EmailMessage } from './types'
import { getMdContent } from './utils'

export async function createMessages (
  config: BaseConfig,
  ctx: MeasureContext,
  token: string,
  message: EmailMessage,
  attachments: Attachment[],
  me: string,
  socialId: SocialId
): Promise<void> {
  const { mailId, from, subject, replyTo } = message
  const tos = [message.to, ...(message.copy ?? [])]
  ctx.info('Sending message', { mailId, from, to: tos.join(',') })

  const accountClient = getAccountClient(config.AccountsURL, token)
  const wsInfo = await accountClient.getLoginInfoByToken()

  if (!isWorkspaceLoginInfo(wsInfo)) {
    ctx.error('Unable to get workspace info', { mailId, from, tos })
    return
  }

  const transactorUrl = wsInfo.endpoint.replace('ws://', 'http://').replace('wss://', 'https://')
  const txClient = await createRestTxOperations(transactorUrl, wsInfo.workspace, wsInfo.token)
  const msgClient = getCommunicationClient(wsInfo.endpoint, wsInfo.workspace, wsInfo.token)
  const restClient = createRestClient(transactorUrl, wsInfo.workspace, wsInfo.token)

  const fromPerson = await restClient.ensurePerson(SocialIdType.EMAIL, from.email, from.firstName, from.lastName)

  const toPersons: { address: string, uuid: PersonUuid, socialId: PersonId }[] = []
  for (const to of tos) {
    const toPerson = await restClient.ensurePerson(SocialIdType.EMAIL, to.email, to.firstName, to.lastName)
    if (toPerson === undefined) {
      continue
    }
    toPersons.push({ address: to.email, ...toPerson })
  }
  if (toPersons.length === 0) {
    ctx.error('Unable to create message without a proper TO', { mailId, from })
    return
  }

  const modifiedBy = fromPerson.socialId
  const participants = [fromPerson.socialId, ...toPersons.map((p) => p.socialId)]
  const content = getMdContent(ctx, message)

  const attachedBlobs: Attachment[] = []
  if (config.StorageConfig !== undefined) {
    const storageConfig = storageConfigFromEnv(config.StorageConfig)
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
    const spaces = await getPersonSpaces(ctx, txClient, mailId, fromPerson.uuid, from.email)
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
        me,
        socialId,
        message.sendOn,
        replyTo
      )
    }
  } catch (error) {
    ctx.error('Failed to save message to personal spaces', {
      error,
      mailId,
      personUuid: fromPerson.uuid,
      email: from
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
          me,
          socialId,
          message.sendOn,
          replyTo
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
    ctx.warn('No personal space found, skip', { mailId, personUuid, email })
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
  me: string,
  socialId: SocialId,
  createdDate: number,
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
        const channel = await getOrCreateChannel(ctx, client, spaceId, participants, me, socialId)
        const newThreadId = await client.createDoc(
          chat.masterTag.Thread,
          space._id,
          {
            title: subject,
            description: content,
            private: true,
            members: participants,
            archived: false,
            createdBy: modifiedBy,
            modifiedBy,
            parent: channel
          },
          generateId(),
          undefined,
          modifiedBy
        )
        threadId = newThreadId as Ref<Card>
        ctx.info('Created new thread', { mailId, threadId, spaceId })
      }

      const { id: messageId, created: messageCreated } = await msgClient.createMessage(
        threadId,
        chat.masterTag.Thread,
        content,
        modifiedBy,
        MessageType.Message,
        {
          created: createdDate
        }
      )
      ctx.info('Created message', { mailId, messageId, threadId, content })

      for (const a of attachments) {
        await msgClient.createFile(
          threadId,
          messageId,
          messageCreated,
          a.id as Ref<Blob>,
          a.contentType,
          a.name,
          a.data.length,
          modifiedBy
        )
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

async function getOrCreateChannel (
  ctx: MeasureContext,
  client: TxOperations,
  space: Ref<PersonSpace>,
  participants: PersonId[],
  me: string,
  socialId: SocialId
): Promise<Ref<Doc> | undefined> {
  try {
    const channel = await client.findOne(chat.masterTag.Channel, { title: me })
    ctx.info('Existing channel', { me, space, channel })
    if (channel != null) return channel._id
    ctx.info('Creating new channel', { me, space })
    return await client.createDoc(
      chat.masterTag.Channel,
      space,
      {
        title: me,
        private: true,
        members: participants,
        archived: false,
        createdBy: socialId._id
      },
      generateId(),
      undefined,
      socialId._id
    )
  } catch (err: any) {
    ctx.error('Failed to create channel', { me, space })
    return undefined
  }
}
