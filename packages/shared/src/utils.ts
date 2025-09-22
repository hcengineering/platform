//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import {
  AppletAttachment,
  Attachment,
  BlobAttachment,
  BlobID,
  CardID,
  type Emoji,
  FindMessagesOptions,
  FindMessagesParams,
  LinkPreviewAttachment,
  linkPreviewType,
  Message,
  MessageDoc,
  MessageID,
  MessagesDoc,
  MessagesGroup,
  MessagesGroupDoc,
  MessagesGroupsDoc,
  type PersonUuid,
  SortingOrder,
  WithTotal
} from '@hcengineering/communication-types'
import { type HulylakeClient } from '@hcengineering/hulylake-client'

const COUNTER_BITS = 10n
const RANDOM_BITS = 10n
const MAX_SEQUENCE = (1n << COUNTER_BITS) - 1n

let counter = 0n

function makeBigIntId (): bigint {
  const ts = BigInt(Date.now())
  counter = counter < MAX_SEQUENCE ? counter + 1n : 0n
  const random = BigInt(Math.floor(Math.random() * Number((1n << RANDOM_BITS) - 1n)))
  return (ts << (COUNTER_BITS + RANDOM_BITS)) | (counter << RANDOM_BITS) | random
}

function toBase64Url (bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  const base64 = typeof btoa === 'function' ? btoa(s) : Buffer.from(bytes).toString('base64')
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateMessageId (): MessageID {
  const idBig = makeBigIntId()
  const buf = new Uint8Array(8)
  new DataView(buf.buffer).setBigUint64(0, idBig, false)
  return toBase64Url(buf) as MessageID
}

export function isAppletAttachment (attachment: Attachment): attachment is AppletAttachment {
  return attachment.mimeType.startsWith('application/vnd.huly.applet.')
}

export function isLinkPreviewAttachmentType (mimeType: string): boolean {
  return mimeType === linkPreviewType
}

export function isAppletAttachmentType (mimeType: string): boolean {
  return mimeType.startsWith('application/vnd.huly.applet.')
}

export function isBlobAttachmentType (mimeType: string): boolean {
  return !isLinkPreviewAttachmentType(mimeType) && !isAppletAttachmentType(mimeType)
}

export function isLinkPreviewAttachment (attachment: Attachment): attachment is LinkPreviewAttachment {
  return attachment.mimeType === linkPreviewType
}

export function isBlobAttachment (attachment: Attachment): attachment is BlobAttachment {
  return !isLinkPreviewAttachment(attachment) && !isAppletAttachment(attachment) && 'blobId' in attachment.params
}

export function withTotal<T> (objects: T[], total?: number): WithTotal<T> {
  const length = total ?? objects.length

  return Object.assign(objects, { total: length })
}

export async function loadMessagesGroups (client: HulylakeClient, cardId: CardID): Promise<MessagesGroup[]> {
  const res = await client.getJson<MessagesGroupsDoc>(`${cardId}/messages/groups`, {
    maxRetries: 3,
    isRetryable: () => true,
    delayStrategy: {
      getDelay: () => 500
    }
  })

  if (res?.body === undefined) {
    return []
  }
  return Object.values(res.body)
    .map((it) => deserializeMessageGroup(it))
    .sort((a, b) => a.fromDate.getTime() - b.fromDate.getTime())
}

function deserializeMessageGroup (group: MessagesGroupDoc): MessagesGroup {
  return {
    cardId: group.cardId,
    blobId: group.blobId,
    fromDate: new Date(group.fromDate),
    toDate: new Date(group.toDate),
    count: group.count
  }
}

export async function loadMessages (
  client: HulylakeClient,
  blobId: BlobID,
  params: FindMessagesParams,
  options?: FindMessagesOptions
): Promise<Message[]> {
  const { cardId } = params
  const res = await client.getJson<MessagesDoc>(`${cardId}/messages/${blobId}`, {
    maxRetries: 3,
    isRetryable: () => true,
    delayStrategy: {
      getDelay: () => 500
    }
  })
  if (res?.body === undefined) {
    return []
  }
  return parseMessagesDoc(res.body, params, options)
}

export function parseMessagesDoc (
  json: MessagesDoc,
  params: FindMessagesParams,
  options?: FindMessagesOptions
): Message[] {
  let messages: Record<MessageID, MessageDoc> = {}
  if (params.id != null) {
    const value = (json.messages as any)[params.id]

    if (value == null) {
      return []
    }

    messages = {
      [params.id]: value
    }
  } else {
    messages = json.messages
  }

  const result: Message[] = []
  for (const m of Object.values(messages)) {
    if (params.limit != null && result.length >= params.limit) break
    const message: Message = {
      id: m.id,
      cardId: m.cardId,
      created: new Date(m.created),
      creator: m.creator,
      type: m.type,
      content: m.content,
      extra: m.extra,
      modified: m.modified != null ? new Date(m.modified) : undefined,
      reactions: {},
      attachments: [],
      threads: []
    }

    if (options?.reactions === true) {
      for (const [emoji, users] of Object.entries(m.reactions)) {
        for (const [user, data] of Object.entries(users)) {
          const messageData = message.reactions[emoji as Emoji] ?? []
          messageData.push({
            count: Number(data.count),
            person: user as PersonUuid,
            date: new Date(data.date)
          })
          message.reactions[emoji as Emoji] = messageData
        }
      }
    }

    if (options?.attachments === true) {
      for (const attachment of Object.values(m.attachments)) {
        message.attachments.push({
          id: attachment.id,
          mimeType: attachment.mimeType,
          params: attachment.params as any,
          creator: m.creator,
          created: new Date(m.created)
        })
      }
    }

    if (options?.threads === true) {
      for (const thread of Object.values(m.threads)) {
        message.threads.push({
          cardId: m.cardId,
          messageId: m.id,
          threadId: thread.threadId,
          threadType: thread.threadType,
          repliesCount: Number(thread.repliesCount),
          lastReplyDate: thread.lastReplyDate != null ? new Date(thread.lastReplyDate) : undefined,
          repliedPersons: thread.repliedPersons
        })
      }
    }

    result.push(message)
  }

  if (params.order === SortingOrder.Ascending) {
    result.sort((a, b) => a.created.getTime() - b.created.getTime())
  } else if (params.order === SortingOrder.Descending) {
    result.sort((a, b) => b.created.getTime() - a.created.getTime())
  }
  return result
}
