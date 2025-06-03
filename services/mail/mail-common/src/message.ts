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
import { MessageID, MessageType } from '@hcengineering/communication-types'
import chat from '@hcengineering/chat'
import { PersonSpace } from '@hcengineering/contact'
import {
  type Blob,
  type MeasureContext,
  type PersonId,
  type Ref,
  type TxOperations,
  AccountUuid,
  generateId,
  RateLimiter
} from '@hcengineering/core'
import { type KeyValueClient } from '@hcengineering/kvs-client'

import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import {
  AddCollaboratorsEvent,
  MessageRequestEventType,
  CreateFileEvent,
  CreateMessageEvent,
  CreateThreadEvent,
  NotificationRequestEventType
} from '@hcengineering/communication-sdk-types'
import { generateMessageId } from '@hcengineering/communication-shared'

import { BaseConfig, type Attachment } from './types'
import { EmailMessage, MailRecipient, MessageData } from './types'
import { getMdContent } from './utils'
import { PersonCacheFactory } from './person'
import { PersonSpacesCacheFactory } from './personSpaces'
import { ChannelCache, ChannelCacheFactory } from './channel'
import { ThreadLookupService } from './thread'

/**
 * Creates mail messages in the platform
 *
 * This function processes an email message and creates corresponding chat messages. It handles:
 * - Ensuring persons exist for email addresses
 * - Finding or creating channels for participants
 * - Creating threads for messages
 * - Uploading attachments to storage
 * - Sending message events to Kafka
 *
 * @param {BaseConfig} config - Configuration options including storage and Kafka settings
 * @param {MeasureContext} ctx - Context for logging and performance measurement
 * @param {TxOperations} txClient - Client for database transactions
 * @param {KeyValueClient} keyValueClient - Client for key-value storage operations
 * @param {Producer} producer - Kafka producer for sending message events
 * @param {string} token - Authentication token for API calls
 * @param {WorkspaceLoginInfo} wsInfo - Workspace information including ID and URLs
 * @param {EmailMessage} message - The email message to process
 * @param {Attachment[]} attachments - Array of attachments for the message
 * @param {MailRecipient[]} [recipients] - Optional list of specific persons who should receive the message.
 *                                         If not provided, all existing accounts from email addresses will be used.
 * @returns {Promise<void>} A promise that resolves when all messages have been created
 * @throws Will log errors but not throw exceptions for partial failures
 *
 * @public
 */
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
  recipients?: MailRecipient[]
): Promise<void> {
  const { mailId, from, subject, replyTo } = message
  const tos = [...(message.to ?? []), ...(message.copy ?? [])]
  ctx.info('Sending message', { mailId, from, to: tos.join(',') })

  const personCache = PersonCacheFactory.getInstance(ctx, wsInfo)
  const personSpacesCache = PersonSpacesCacheFactory.getInstance(ctx, txClient, wsInfo.workspace)
  const channelCache = ChannelCacheFactory.getInstance(ctx, txClient, wsInfo.workspace)
  const threadLookup = ThreadLookupService.getInstance(ctx, keyValueClient, token)

  const fromPerson = await personCache.ensurePerson(from)

  const toPersons: MailRecipient[] = []
  for (const to of tos) {
    const toPerson = await personCache.ensurePerson(to)
    if (toPerson === undefined) {
      continue
    }
    toPersons.push({ email: to.email, ...toPerson })
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

  const allPersons = [{ ...fromPerson, email: from.email }, ...toPersons]
  const messageRecipients = recipients != null && recipients.length > 0 ? recipients : allPersons

  for (const person of messageRecipients) {
    try {
      const spaces = await personSpacesCache.getPersonSpaces(mailId, person.uuid, person.email)
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
          person,
          message.sendOn,
          channelCache,
          replyTo
        )
      }
    } catch (error) {
      ctx.error('Failed to save message spaces', { error, mailId, personUuid: person.uuid, email: person.email })
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
  recipient: MailRecipient,
  createdDate: number,
  channelCache: ChannelCache,
  inReplyTo?: string
): Promise<void> {
  const rateLimiter = new RateLimiter(10)
  for (const space of spaces) {
    const spaceId = space._id
    let isReply = false
    await rateLimiter.add(async () => {
      let threadId = await threadLookup.getThreadId(mailId, spaceId)
      if (threadId !== undefined) {
        ctx.info('Message is already in the thread, skip', { mailId, threadId, spaceId })
        return
      }

      if (inReplyTo !== undefined) {
        threadId = await threadLookup.getParentThreadId(inReplyTo, spaceId)
        isReply = threadId !== undefined
      }
      const channel = await channelCache.getOrCreateChannel(spaceId, participants, recipient.email, recipient.socialId)
      if (threadId === undefined) {
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
        threadId = newThreadId as Ref<Card>
      }

      const created = new Date(createdDate)

      const messageData: MessageData = {
        subject,
        content,
        channel,
        created,
        modifiedBy,
        mailId,
        spaceId,
        threadId,
        workspace: wsInfo.workspace,
        recipient,
        isReply
      }

      const messageId = await createMailMessage(producer, config, messageData, threadId)
      if (!isReply) {
        await addCollaborators(producer, config, messageData, threadId)
        await createMailThread(producer, config, messageData, messageId)
      }
      await createFiles(producer, config, attachments, messageData, threadId, messageId)

      await threadLookup.setThreadId(mailId, space._id, threadId)
    })
  }
  await rateLimiter.waitProcessing()
}

async function createMailThread (
  producer: Producer,
  config: BaseConfig,
  data: MessageData,
  messageId: MessageID
): Promise<void> {
  const threadEvent: CreateThreadEvent = {
    type: MessageRequestEventType.CreateThread,
    card: data.channel,
    message: messageId,
    messageCreated: data.created,
    thread: data.threadId,
    threadType: chat.masterTag.Thread
  }
  const thread = Buffer.from(JSON.stringify(threadEvent))
  await sendToCommunicationTopic(producer, config, data, thread)
}

async function createMailMessage (
  producer: Producer,
  config: BaseConfig,
  data: MessageData,
  threadId: Ref<Card>
): Promise<MessageID> {
  const messageId = generateMessageId()
  const createMessageEvent: CreateMessageEvent = {
    type: MessageRequestEventType.CreateMessage,
    messageType: MessageType.Message,
    card: data.isReply ? threadId : data.channel,
    cardType: chat.masterTag.Thread,
    content: data.content,
    creator: data.modifiedBy,
    created: data.created,
    id: messageId
  }
  const createMessageData = Buffer.from(JSON.stringify(createMessageEvent))
  await sendToCommunicationTopic(producer, config, data, createMessageData)
  return messageId
}

async function createFiles (
  producer: Producer,
  config: BaseConfig,
  attachments: Attachment[],
  messageData: MessageData,
  threadId: Ref<Card>,
  messageId: MessageID
): Promise<void> {
  const fileData: Buffer[] = attachments.map((a) => {
    const creeateFileEvent: CreateFileEvent = {
      type: MessageRequestEventType.CreateFile,
      card: threadId,
      message: messageId,
      messageCreated: messageData.created,
      creator: messageData.modifiedBy,
      data: {
        blobId: a.id as Ref<Blob>,
        type: a.contentType,
        filename: a.name,
        size: a.data.length
      }
    }
    return Buffer.from(JSON.stringify(creeateFileEvent))
  })
  const fileEvents = fileData.map((data) => ({
    key: Buffer.from(messageData.channel ?? messageData.spaceId),
    value: data,
    headers: {
      WorkspaceUuid: messageData.workspace
    }
  }))
  await producer.send({
    topic: config.CommunicationTopic,
    messages: fileEvents
  })
}

async function addCollaborators (
  producer: Producer,
  config: BaseConfig,
  data: MessageData,
  threadId: Ref<Card>
): Promise<void> {
  if (data.recipient.socialId === data.modifiedBy) {
    return // Message author should be automatically added as a collaborator
  }
  const addCollaboratorsEvent: AddCollaboratorsEvent = {
    type: NotificationRequestEventType.AddCollaborators,
    card: threadId,
    cardType: chat.masterTag.Thread,
    collaborators: [data.recipient.uuid as AccountUuid],
    creator: data.modifiedBy
  }
  const createMessageData = Buffer.from(JSON.stringify(addCollaboratorsEvent))
  await sendToCommunicationTopic(producer, config, data, createMessageData)
}

async function sendToCommunicationTopic (
  producer: Producer,
  config: BaseConfig,
  messageData: MessageData,
  content: Buffer
): Promise<void> {
  await producer.send({
    topic: config.CommunicationTopic,
    messages: [
      {
        key: Buffer.from(messageData.channel ?? messageData.spaceId),
        value: content,
        headers: {
          WorkspaceUuid: messageData.workspace
        }
      }
    ]
  })
}
