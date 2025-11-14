// Copyright © 2025 Hardcore Engineering Inc.
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

import {
  AttachmentID,
  ContextID,
  Message,
  MessageID,
  Notification,
  NotificationContext,
  NotificationID,
  PersonUuid,
  Emoji,
  AttachmentData,
  SocialID,
  Attachment,
  AttachmentUpdateData,
  CardID,
  CardType
} from '@hcengineering/communication-types'
import {
  AddAttachmentsOperation,
  CreateMessageEvent,
  CreateNotificationContextEvent,
  CreateNotificationEvent,
  MessageEventType,
  PatchEvent,
  RemoveAttachmentsOperation,
  RemoveNotificationContextEvent,
  SetAttachmentsOperation,
  UpdateAttachmentsOperation,
  UpdateNotificationContextEvent,
  ReactionPatchEvent,
  AttachmentPatchEvent,
  BlobPatchEvent,
  ThreadPatchEvent
} from '@hcengineering/communication-sdk-types'

import { withTotal } from './utils'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MessageProcessor {
  static create (event: CreateMessageEvent, id?: MessageID): Message {
    const messageId = event.messageId ?? (id as MessageID)
    if (messageId == null) throw new Error('Message id is required')
    return {
      id: messageId,
      cardId: event.cardId,
      type: event.messageType,
      content: event.content,
      extra: event.extra,
      creator: event.socialId,
      created: new Date(event.date ?? Date.now()),
      language: event.language,
      reactions: {},
      attachments: [],
      threads: []
    }
  }

  static applyPatch (message: Message, patchEvent: PatchEvent): Message | undefined {
    return applyPatchEvent(message, patchEvent)
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NotificationContextProcessor {
  static create (event: CreateNotificationContextEvent, id?: ContextID): NotificationContext {
    const contextId: ContextID | undefined = event.contextId ?? id

    if (contextId == null) {
      throw new Error('Notification context id is required')
    }
    return {
      id: contextId,
      cardId: event.cardId,
      account: event.account,
      lastView: event.lastView,
      lastUpdate: event.lastUpdate,
      lastNotify: event.lastNotify,
      notifications: withTotal([] as Notification[])
    }
  }

  static update (context: NotificationContext, event: UpdateNotificationContextEvent): NotificationContext {
    if (context.account !== event.account || context.id !== event.contextId) return context
    return {
      ...context,
      lastView: event.updates.lastView ?? context.lastView,
      lastUpdate: event.updates.lastUpdate ?? context.lastUpdate,
      lastNotify: event.updates.lastNotify ?? context.lastNotify
    }
  }

  static remove (context: NotificationContext, event: RemoveNotificationContextEvent): NotificationContext | undefined {
    if (context.account !== event.account || context.id !== event.contextId) return context
    return undefined
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NotificationProcessor {
  static create (event: CreateNotificationEvent, id?: NotificationID): Notification {
    const notificationId: NotificationID | undefined = event.notificationId ?? (id as NotificationID)

    if (notificationId == null) {
      throw new Error('Notification id is required')
    }
    return {
      id: notificationId,
      cardId: event.cardId,
      contextId: event.contextId,
      account: event.account,
      type: event.notificationType,
      read: event.read,
      content: event.content ?? {},
      created: event.date ?? new Date(),
      messageId: event.messageId,
      creator: event.creator,
      blobId: event.blobId
    }
  }
}

function applyPatchEvent (message: Message, event: PatchEvent): Message | undefined {
  if (message.cardId !== event.cardId || message.id !== event.messageId) return message
  const date = event.date ?? new Date()

  switch (event.type) {
    case MessageEventType.UpdatePatch: {
      if (date.getTime() < (message.modified?.getTime() ?? 0)) {
        return message
      }
      const shouldUpdateDate = event.content != null || event.extra != null
      return {
        ...message,
        modified: shouldUpdateDate ? date : message.modified,
        content: event.content ?? message.content,
        extra: event.extra ?? message.extra,
        language: event.language ?? message.language
      }
    }
    case MessageEventType.RemovePatch: {
      return undefined
    }
    case MessageEventType.ReactionPatch:
      return patchReactions(message, event, date)
    case MessageEventType.AttachmentPatch:
      return patchAttachments(message, event, date)
    case MessageEventType.BlobPatch:
      return patchBlobs(message, event, date)
    case MessageEventType.ThreadPatch:
      return patchThread(message, event, date)
  }
  return message
}

function patchReactions (message: Message, event: ReactionPatchEvent, date: Date): Message {
  if (event.personUuid == null) return message
  if (event.operation.opcode === 'add') {
    return addReaction(message, event.operation.reaction, event.personUuid, date)
  } else if (event.operation.opcode === 'remove') {
    return removeReaction(message, event.operation.reaction, event.personUuid)
  }
  return message
}

function addReaction (message: Message, emoji: Emoji, creator: PersonUuid, created: Date): Message {
  const emojiData = message.reactions[emoji] ?? []
  if (emojiData.some((it) => it.person === creator)) return message

  const data = {
    count: 1,
    person: creator,
    date: created
  }

  message.reactions = {
    ...message.reactions,
    [emoji]: [...emojiData, data]
  }
  return message
}

function removeReaction (message: Message, emoji: Emoji, creator: PersonUuid): Message {
  const emojiData = message.reactions[emoji] ?? []
  if (!emojiData.some((it) => it.person === creator)) return message

  return {
    ...message,
    reactions: {
      ...message.reactions,
      [emoji]: emojiData.filter((it) => it.person !== creator)
    }
  }
}

function patchAttachments (message: Message, event: AttachmentPatchEvent, date: Date): Message {
  for (const op of event.operations) {
    if (op.opcode === 'add') {
      return addAttachments(message, op.attachments, event.socialId, date)
    } else if (op.opcode === 'remove') {
      return removeAttachments(message, op.ids)
    } else if (op.opcode === 'set') {
      return setAttachments(message, op.attachments, event.socialId, date)
    } else if (op.opcode === 'update') {
      return updateAttachments(message, op.attachments, date)
    }
  }
  return message
}

function patchBlobs (message: Message, event: BlobPatchEvent, date: Date): Message {
  const operations: (
    | AddAttachmentsOperation
    | RemoveAttachmentsOperation
    | SetAttachmentsOperation
    | UpdateAttachmentsOperation
  )[] = []
  for (const op of event.operations) {
    if (op.opcode === 'attach') {
      operations.push({
        opcode: 'add',
        attachments: op.blobs.map((it) => ({
          id: it.blobId as any as AttachmentID,
          mimeType: it.mimeType ?? it.mimeType,
          params: it
        }))
      })
    } else if (op.opcode === 'detach') {
      operations.push({
        opcode: 'remove',
        ids: op.blobIds as any as AttachmentID[]
      })
    } else if (op.opcode === 'set') {
      operations.push({
        opcode: 'set',
        attachments: op.blobs.map((it) => ({
          id: it.blobId as any as AttachmentID,
          mimeType: it.mimeType ?? it.mimeType,
          params: it
        }))
      })
    } else if (op.opcode === 'update') {
      operations.push({
        opcode: 'update',
        attachments: op.blobs.map((it) => ({
          id: it.blobId as any as AttachmentID,
          params: it
        }))
      })
    }
  }

  const ev: AttachmentPatchEvent = {
    type: MessageEventType.AttachmentPatch,
    cardId: message.cardId,
    messageId: message.id,
    operations,
    socialId: event.socialId,
    date: event.date
  }

  return patchAttachments(message, ev, date)
}

function addAttachments (message: Message, data: AttachmentData[], creator: SocialID, created: Date): Message {
  const newAttachments: Attachment[] = []
  for (const attach of data) {
    const isExists = message.attachments.some((it) => it.id === attach.id)
    if (isExists === undefined) continue
    const attachment: Attachment = {
      ...attach,
      created,
      creator
    } as any
    newAttachments.push(attachment)
  }

  if (newAttachments.length === 0) return message
  return {
    ...message,
    attachments: [...message.attachments, ...newAttachments]
  }
}

function updateAttachments (message: Message, updates: AttachmentUpdateData[], date: Date): Message {
  if (updates.length === 0) return message
  const updatedAttachments: Attachment[] = []
  for (const attachment of message.attachments) {
    const update = updates.find((it) => it.id === attachment.id)
    if (update === undefined) {
      updatedAttachments.push(attachment)
    } else {
      updatedAttachments.push({
        ...attachment,
        params: {
          ...attachment.params,
          ...update.params
        },
        modified: date.getTime() > (attachment.modified?.getTime() ?? 0) ? date : attachment.modified
      } as any)
    }
  }

  return {
    ...message,
    attachments: updatedAttachments
  }
}

function removeAttachments (message: Message, ids: AttachmentID[]): Message {
  const attachments = message.attachments.filter((it) => !ids.includes(it.id))
  if (attachments.length === message.attachments.length) return message

  return {
    ...message,
    attachments
  }
}

function setAttachments (message: Message, data: AttachmentData[], creator: SocialID, created: Date): Message {
  if (data.length === 0) return message
  return {
    ...message,
    attachments: data.map(
      (it) =>
        ({
          ...it,
          created,
          creator
        }) as any
    )
  }
}

function patchThread (message: Message, event: ThreadPatchEvent, date: Date): Message {
  const { operation } = event
  if (operation.opcode === 'attach') {
    return attachThread(message, operation.threadId, operation.threadType)
  } else if (operation.opcode === 'update') {
    return updateThread(message, operation.threadId, operation.update.threadType)
  } else if (operation.opcode === 'addReply') {
    if (event.personUuid == null) return message
    return addReply(message, operation.threadId, event.personUuid, date)
  } else if (operation.opcode === 'removeReply') {
    if (event.personUuid == null) return message
    return removeReply(message, operation.threadId, event.personUuid)
  }
  return message
}

function attachThread (message: Message, threadId: CardID, threadType: CardType): Message {
  if (message.threads.some((thread) => thread.threadId === threadId)) return message
  return {
    ...message,
    threads: [
      ...message.threads,
      {
        cardId: message.cardId,
        messageId: message.id,
        threadId,
        threadType,
        repliesCount: 0,
        lastReplyDate: undefined,
        repliedPersons: {}
      }
    ]
  }
}

function updateThread (message: Message, threadId: CardID, threadType: CardType): Message {
  if (message.threads.length === 0) return message
  const t = message.threads.find((it) => it.threadId === threadId)
  if (t === undefined) return message

  return {
    ...message,
    threads: message.threads.map((it) =>
      it.threadId === threadId
        ? {
            ...it,
            threadType
          }
        : it
    )
  }
}

function addReply (message: Message, threadId: CardID, person: PersonUuid, date: Date): Message {
  if (!message.threads.some((thread) => thread.threadId === threadId)) return message
  return {
    ...message,
    threads: message.threads.map((it) =>
      it.threadId === threadId
        ? {
            ...it,
            repliesCount: it.repliesCount + 1,
            lastReplyDate: date.getTime() > (it.lastReplyDate?.getTime() ?? 0) ? date : it.lastReplyDate,
            repliedPersons: {
              ...it.repliedPersons,
              [person]: (it.repliedPersons[person] ?? 0) + 1
            }
          }
        : it
    )
  }
}

function removeReply (message: Message, threadId: CardID, person: PersonUuid): Message {
  if (!message.threads.some((thread) => thread.threadId === threadId)) return message
  return {
    ...message,
    threads: message.threads.map((it) =>
      it.threadId === threadId
        ? {
            ...it,
            repliesCount: Math.max(0, it.repliesCount - 1),
            repliedPersons: {
              ...it.repliedPersons,
              [person]: Math.max(0, (it.repliedPersons[person] ?? 0) - 1)
            }
          }
        : it
    )
  }
}
