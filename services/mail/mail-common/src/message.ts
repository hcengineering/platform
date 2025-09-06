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
import core, {
  type Blob,
  type MeasureContext,
  type PersonId,
  type Ref,
  type TxDomainEvent,
  type TxOperations,
  AccountUuid,
  generateId,
  RateLimiter,
  Space
} from '@hcengineering/core'
import { type KeyValueClient } from '@hcengineering/kvs-client'

import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import {
  AddCollaboratorsEvent,
  BlobPatchEvent,
  CreateMessageEvent,
  MessageEventType,
  NotificationEventType,
  ThreadPatchEvent
} from '@hcengineering/communication-sdk-types'
import { generateMessageId } from '@hcengineering/communication-shared'

import { BaseConfig, SyncOptions, type Attachment } from './types'
import { COMMUNICATION_DOMAIN, EmailMessage, MailRecipient, MessageData } from './types'
import { getBlobMetadata, getHulyIdFromEmailMessageId, getMdContent, MessageTimeShift } from './utils'
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
  recipients?: MailRecipient[],
  options?: SyncOptions
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
      let spaces = options?.spaceId != null ? [options.spaceId] : undefined
      if (spaces === undefined) {
        spaces = (await personSpacesCache.getPersonSpaces(mailId, person.uuid, person.email)).map((s) => s._id)
      }
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
          message,
          channelCache,
          replyTo,
          options
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
  spaces: Ref<Space>[],
  participants: PersonId[],
  modifiedBy: PersonId,
  subject: string,
  content: string,
  attachments: Attachment[],
  recipient: MailRecipient,
  mailMessage: EmailMessage,
  channelCache: ChannelCache,
  inReplyTo?: string,
  options?: SyncOptions
): Promise<void> {
  const rateLimiter = new RateLimiter(10)
  const createdDate = mailMessage.sendOn ?? Date.now()
  for (const spaceId of spaces) {
    let isReply = false
    await rateLimiter.add(async () => {
      let threadId = await threadLookup.getThreadId(mailId, spaceId, recipient.email)
      if (threadId !== undefined) {
        ctx.info('Message is already in the thread, skip', { mailId, threadId, spaceId })
        return
      }

      if (inReplyTo !== undefined) {
        threadId = await threadLookup.getParentThreadId(inReplyTo, spaceId, recipient.email)
        isReply = threadId !== undefined
      }
      const channel = await channelCache.getOrCreateChannel(spaceId, participants, recipient.email, recipient.socialId)
      if (threadId === undefined) {
        const newThreadId = await client.createDoc(
          chat.masterTag.Thread,
          spaceId,
          {
            title: subject,
            description: content,
            private: true,
            members: participants,
            archived: false,
            createdBy: modifiedBy,
            modifiedBy,
            parent: channel,
            createdOn: createdDate + MessageTimeShift.ThreadCard // Add a small shift to ensure correct ordering
          },
          generateId(),
          createdDate + MessageTimeShift.ThreadCard,
          modifiedBy
        )
        threadId = newThreadId as Ref<Card>
      }

      const created = new Date(createdDate)

      const messageData: MessageData = {
        subject,
        from: mailMessage.from.email,
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

      if (!isReply) {
        await addCollaborators(producer, config, messageData, threadId)
        await createMailThread(producer, config, messageData, options)
      }
      const messageId = await createMailMessage(producer, config, messageData, threadId, options)
      await createFiles(ctx, producer, config, attachments, messageData, threadId, messageId)

      await threadLookup.setThreadId(mailId, spaceId, threadId, recipient.email)
    })
  }
  await rateLimiter.waitProcessing()
}

async function createMailThread (
  producer: Producer,
  config: BaseConfig,
  data: MessageData,
  options?: SyncOptions
): Promise<void> {
  const subjectId = generateMessageId()
  const createSubjectEvent: CreateMessageEvent = {
    type: MessageEventType.CreateMessage,
    messageType: MessageType.Message,
    cardId: data.channel,
    cardType: chat.masterTag.Thread,
    content: data.subject,
    socialId: data.modifiedBy,
    date: new Date(data.created.getTime() + MessageTimeShift.Subject),
    messageId: subjectId,
    options: {
      noNotify: options?.noNotify
    },
    extra: data.extra
  }
  const createSubjectData = toEventBuffer(createSubjectEvent)
  await sendToCommunicationTopic(producer, config, data, createSubjectData)

  const threadEvent: ThreadPatchEvent = {
    type: MessageEventType.ThreadPatch,
    cardId: data.channel,
    messageId: subjectId,
    operation: {
      opcode: 'attach',
      threadId: data.threadId,
      threadType: chat.masterTag.Thread
    },
    socialId: data.modifiedBy,
    date: new Date(data.created.getTime() + MessageTimeShift.Thread)
  }
  const thread = toEventBuffer(threadEvent)
  await sendToCommunicationTopic(producer, config, data, thread)
}

async function createMailMessage (
  producer: Producer,
  config: BaseConfig,
  data: MessageData,
  threadId: Ref<Card>,
  options?: SyncOptions
): Promise<MessageID> {
  const messageId = getHulyIdFromEmailMessageId(data.mailId, data.from) ?? generateMessageId()
  const createMessageEvent: CreateMessageEvent = {
    type: MessageEventType.CreateMessage,
    messageType: MessageType.Message,
    cardId: threadId,
    cardType: chat.masterTag.Thread,
    content: data.content,
    socialId: data.modifiedBy,
    date: data.created,
    messageId,
    options: {
      noNotify: options?.noNotify
    },
    extra: data.extra
  }
  const createMessageData = toEventBuffer(createMessageEvent)
  await sendToCommunicationTopic(producer, config, data, createMessageData)
  return messageId
}

async function createFiles (
  ctx: MeasureContext,
  producer: Producer,
  config: BaseConfig,
  attachments: Attachment[],
  messageData: MessageData,
  threadId: Ref<Card>,
  messageId: MessageID
): Promise<void> {
  const fileData: Buffer[] = attachments.map((a) => {
    const attachBlobEvent: BlobPatchEvent = {
      type: MessageEventType.BlobPatch,
      cardId: threadId,
      messageId,
      socialId: messageData.modifiedBy,
      operations: [
        {
          opcode: 'attach',
          blobs: [
            {
              blobId: a.id as Ref<Blob>,
              mimeType: a.contentType,
              fileName: a.name,
              size: a.data.length,
              metadata: getBlobMetadata(ctx, a)
            }
          ]
        }
      ]
    }
    return toEventBuffer(attachBlobEvent)
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
    type: NotificationEventType.AddCollaborators,
    cardId: threadId,
    cardType: chat.masterTag.Thread,
    collaborators: [data.recipient.uuid as AccountUuid],
    socialId: data.modifiedBy,
    date: new Date(data.created.getTime() + MessageTimeShift.Collaborator)
  }
  const createMessageData = toEventBuffer(addCollaboratorsEvent)
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

function toEventBuffer (data: Record<string, any>): Buffer {
  return Buffer.from(JSON.stringify(wrapToTx(data)))
}

function wrapToTx (data: Record<string, any>): TxDomainEvent {
  return {
    _id: generateId(),
    space: core.space.Tx,
    objectSpace: core.space.Domain,
    _class: core.class.TxDomainEvent,
    domain: COMMUNICATION_DOMAIN,
    event: data,
    modifiedOn: Date.now(),
    modifiedBy: data.socialId
  }
}
