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
import { Producer } from 'kafkajs'

import { WorkspaceLoginInfo } from '@hcengineering/account-client'
import { type Card } from '@hcengineering/card'
import { MessageType } from '@hcengineering/communication-types'
import chat from '@hcengineering/chat'
import { PersonSpace } from '@hcengineering/contact'
import {
  type Blob,
  type MeasureContext,
  type PersonId,
  type Ref,
  type TxOperations,
  Doc,
  generateId,
  PersonUuid,
  RateLimiter,
  Space
} from '@hcengineering/core'
import mail from '@hcengineering/mail'
import { type KeyValueClient } from '@hcengineering/kvs-client'

import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { MessageRequestEventType } from '@hcengineering/communication-sdk-types'
import { generateMessageId } from '@hcengineering/communication-shared'

import { BaseConfig, type Attachment } from './types'
import { EmailMessage } from './types'
import { getMdContent } from './utils'
import { PersonCacheFactory } from './person'
import { PersonSpacesCacheFactory } from './personSpaces'
import { ChannelCache, ChannelCacheFactory } from './channel'
import { ThreadLookupService } from './thread'

export async function createMessages (
  config: BaseConfig,
  ctx: MeasureContext,
  txClient: TxOperations,
  keyValueClient: KeyValueClient,
  producer: Producer,
  token: string,
  wsInfo: WorkspaceLoginInfo,
  message: EmailMessage,
  attachments: Attachment[],
  // Persons who should receive messages in the platform, all existing accounts from email addresses by default
  targetPersons?: PersonId[]
): Promise<void> {
  const { mailId, from, subject, replyTo } = message
  const tos = [...(message.to ?? []), ...(message.copy ?? [])]
  ctx.info('Sending message', { mailId, from, to: tos.join(',') })

  const personCache = PersonCacheFactory.getInstance(ctx, wsInfo)
  const personSpacesCache = PersonSpacesCacheFactory.getInstance(ctx, txClient, wsInfo.workspace)
  const channelCache = ChannelCacheFactory.getInstance(ctx, txClient, wsInfo.workspace)
  const threadLookup = ThreadLookupService.getInstance(ctx, keyValueClient, token)

  const fromPerson = await personCache.ensurePerson(from)

  const toPersons: { address: string, uuid: PersonUuid, socialId: PersonId }[] = []
  for (const to of tos) {
    const toPerson = await personCache.ensurePerson(to)
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
  const participants = targetPersons ?? [fromPerson.socialId, ...toPersons.map((p) => p.socialId)]
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
    const spaces = await personSpacesCache.getPersonSpaces(mailId, fromPerson.uuid, from.email)
    if (spaces.length > 0) {
      await saveMessageToSpaces(
        config,
        ctx,
        txClient,
        producer,
        threadLookup,
        wsInfo,
        mailId,
        spaces,
        participants,
        modifiedBy,
        subject,
        content,
        attachedBlobs,
        from.email,
        fromPerson.socialId,
        message.sendOn,
        channelCache,
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
      const spaces = await personSpacesCache.getPersonSpaces(mailId, to.uuid, to.address)
      if (spaces.length > 0) {
        await saveMessageToSpaces(
          config,
          ctx,
          txClient,
          producer,
          threadLookup,
          wsInfo,
          mailId,
          spaces,
          participants,
          modifiedBy,
          subject,
          content,
          attachedBlobs,
          to.address,
          to.socialId,
          message.sendOn,
          channelCache,
          replyTo
        )
      }
    } catch (error) {
      ctx.error('Failed to save message spaces', { error, mailId, personUuid: to.uuid, email: to.address })
    }
  }
}

async function saveMessageToSpaces (
  config: BaseConfig,
  ctx: MeasureContext,
  client: TxOperations,
  producer: Producer,
  threadLookup: ThreadLookupService,
  wsInfo: WorkspaceLoginInfo,
  mailId: string,
  spaces: PersonSpace[],
  participants: PersonId[],
  modifiedBy: PersonId,
  subject: string,
  content: string,
  attachments: Attachment[],
  me: string,
  owner: PersonId,
  createdDate: number,
  channelCache: ChannelCache,
  inReplyTo?: string
): Promise<void> {
  const rateLimiter = new RateLimiter(10)
  for (const space of spaces) {
    const spaceId = space._id
    await rateLimiter.add(async () => {
      ctx.info('Saving message to space', { mailId, space: spaceId })

      let threadId = await threadLookup.getThreadId(mailId, spaceId)
      if (threadId !== undefined) {
        ctx.info('Message is already in the thread, skip', { mailId, threadId, spaceId })
        return
      }

      if (inReplyTo !== undefined) {
        threadId = await threadLookup.getParentThreadId(inReplyTo, spaceId)
        if (threadId !== undefined) {
          ctx.info('Found existing thread', { mailId, threadId, spaceId })
        }
      }
      let channel: Ref<Doc<Space>> | undefined
      if (threadId === undefined) {
        channel = await channelCache.getOrCreateChannel(spaceId, participants, me, owner)
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
            parent: channel,
            createdOn: createdDate
          },
          generateId(),
          createdDate,
          modifiedBy
        )
        await client.createMixin(
          newThreadId,
          chat.masterTag.Thread,
          space._id,
          mail.tag.MailThread,
          {},
          createdDate,
          owner
        )
        threadId = newThreadId as Ref<Card>
        ctx.info('Created new thread', { mailId, threadId, spaceId })
      }

      const messageId = generateMessageId()
      const created = new Date(createdDate)

      const messageData = Buffer.from(
        JSON.stringify({
          type: MessageRequestEventType.CreateMessage,
          messageType: MessageType.Message,
          card: threadId,
          cardType: chat.masterTag.Thread,
          content,
          creator: modifiedBy,
          created,
          id: messageId
        })
      )
      await producer.send({
        topic: config.CommunicationTopic,
        messages: [
          {
            key: Buffer.from(channel ?? spaceId),
            value: messageData,
            headers: {
              WorkspaceUuid: wsInfo.workspace
            }
          }
        ]
      })
      ctx.info('Send message event', { mailId, messageId, threadId })

      const fileData: Buffer[] = attachments.map((a) =>
        Buffer.from(
          JSON.stringify({
            type: MessageRequestEventType.CreateFile,
            card: threadId,
            message: messageId,
            messageCreated: created,
            blobId: a.id as Ref<Blob>,
            fileType: a.contentType,
            filename: a.name,
            size: a.data.length,
            creator: modifiedBy
          })
        )
      )
      const fileEvents = fileData.map((data) => ({
        key: Buffer.from(channel ?? spaceId),
        value: data,
        headers: {
          WorkspaceUuid: wsInfo.workspace
        }
      }))
      await producer.send({
        topic: config.CommunicationTopic,
        messages: fileEvents
      })
      ctx.info('Send file events', { mailId, messageId, threadId, count: fileEvents.length })

      await threadLookup.setThreadId(mailId, space._id, threadId)
    })
  }
  await rateLimiter.waitProcessing()
}
