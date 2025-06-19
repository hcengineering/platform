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
  AttachBlobsPatchData,
  AttachLinkPreviewsPatchData,
  AttachThreadPatchData,
  ContextID,
  DetachBlobsPatchData,
  DetachLinkPreviewsPatchData,
  Message,
  MessageID,
  Notification,
  NotificationContext,
  NotificationID,
  Patch,
  PatchType,
  SetBlobsPatchData,
  SetLinkPreviewsPatchData,
  UpdateThreadPatchData
} from '@hcengineering/communication-types'
import {
  AttachBlobsOperation,
  AttachLinkPreviewsOperation,
  AttachThreadOperation,
  CreateMessageEvent,
  CreateNotificationContextEvent,
  CreateNotificationEvent,
  DetachBlobsOperation,
  DetachLinkPreviewsOperation,
  MessageEventType,
  PatchEvent,
  RemoveNotificationContextEvent,
  SetBlobsOperation,
  SetLinkPreviewsOperation,
  UpdateNotificationContextEvent,
  UpdateThreadOperation
} from '@hcengineering/communication-sdk-types'

import { applyPatches } from './patch'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MessageProcessor {
  static createFromEvent (event: CreateMessageEvent, id?: MessageID): Message {
    const messageId = event.messageId ?? (id as MessageID)
    if (messageId == null) throw new Error('Message id is required')
    return {
      id: messageId,
      cardId: event.cardId,
      type: event.messageType,
      content: event.content,
      extra: event.extra,
      creator: event.socialId,
      created: event.date ?? new Date(),
      removed: false,
      reactions: [],
      blobs: [],
      linkPreviews: []
    }
  }

  static applyPatchEvent (message: Message, patchEvent: PatchEvent, allowedPatchTypes?: PatchType[]): Message {
    const patches = this.eventToPatches(patchEvent).filter((it) => it.messageId === message.id)
    return applyPatches(message, patches, allowedPatchTypes)
  }

  static eventToPatches (event: PatchEvent): Patch[] {
    switch (event.type) {
      case MessageEventType.UpdatePatch: {
        return [
          {
            messageId: event.messageId,
            type: PatchType.update,
            creator: event.socialId,
            created: event.date ?? new Date(),
            data: {
              content: event.content,
              extra: event.extra
            }
          }
        ]
      }
      case MessageEventType.RemovePatch:
        return [
          {
            messageId: event.messageId,
            type: PatchType.remove,
            creator: event.socialId,
            created: event.date ?? new Date(),
            data: {}
          }
        ]
      case MessageEventType.ReactionPatch:
        return [
          {
            messageId: event.messageId,
            type: PatchType.reaction,
            creator: event.socialId,
            created: event.date ?? new Date(),
            data: {
              operation: event.operation.opcode,
              reaction: event.operation.reaction
            }
          }
        ]
      case MessageEventType.BlobPatch:
        return event.operations
          .map((it) => blobOperationToPatchData(it))
          .filter((x) => x != null)
          .map((it) => ({
            messageId: event.messageId,
            type: PatchType.blob,
            creator: event.socialId,
            created: event.date ?? new Date(),
            data: it
          }))

      case MessageEventType.LinkPreviewPatch:
        return event.operations
          .map((it) => linkPreviewOperationToPatchData(it))
          .filter((x) => x != null)
          .map((it) => ({
            messageId: event.messageId,
            type: PatchType.linkPreview,
            creator: event.socialId,
            created: event.date ?? new Date(),
            data: it
          }))

      case MessageEventType.ThreadPatch: {
        const data = threadOperationToPatchData(event.operation)
        if (data == null) return []
        return [
          {
            messageId: event.messageId,
            type: PatchType.thread,
            creator: event.socialId,
            created: event.date ?? new Date(),
            data
          }
        ]
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NotificationContextProcessor {
  static createFromEvent (event: CreateNotificationContextEvent, id?: ContextID): NotificationContext {
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
      notifications: []
    }
  }

  static updateFromEvent (context: NotificationContext, event: UpdateNotificationContextEvent): NotificationContext {
    if (context.account !== event.account || context.id !== event.contextId) return context
    return {
      ...context,
      lastView: event.updates.lastView ?? context.lastView,
      lastUpdate: event.updates.lastUpdate ?? context.lastUpdate,
      lastNotify: event.updates.lastNotify ?? context.lastNotify
    }
  }

  static removeFromEvent (
    context: NotificationContext,
    event: RemoveNotificationContextEvent
  ): NotificationContext | undefined {
    if (context.account !== event.account || context.id !== event.contextId) return context
    return undefined
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NotificationProcessor {
  static createFromEvent (event: CreateNotificationEvent, id?: NotificationID): Notification {
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
      messageCreated: event.messageCreated
    }
  }
}

function blobOperationToPatchData (
  operation: AttachBlobsOperation | DetachBlobsOperation | SetBlobsOperation
): AttachBlobsPatchData | DetachBlobsPatchData | SetBlobsPatchData | undefined {
  if (operation.opcode === 'attach') {
    return {
      operation: 'attach',
      blobs: operation.blobs
    }
  } else if (operation.opcode === 'detach') {
    return {
      operation: 'detach',
      blobIds: operation.blobIds
    }
  } else if (operation.opcode === 'set') {
    return {
      operation: 'set',
      blobs: operation.blobs
    }
  }

  return undefined
}

function linkPreviewOperationToPatchData (
  operation: AttachLinkPreviewsOperation | DetachLinkPreviewsOperation | SetLinkPreviewsOperation
): AttachLinkPreviewsPatchData | DetachLinkPreviewsPatchData | SetLinkPreviewsPatchData | undefined {
  if (operation.opcode === 'attach') {
    return {
      operation: 'attach',
      previews: operation.previews
    }
  } else if (operation.opcode === 'detach') {
    return {
      operation: 'detach',
      previewIds: operation.previewIds
    }
  } else if (operation.opcode === 'set') {
    return {
      operation: 'set',
      previews: operation.previews
    }
  }

  return undefined
}

function threadOperationToPatchData (
  operation: AttachThreadOperation | UpdateThreadOperation
): AttachThreadPatchData | UpdateThreadPatchData | undefined {
  if (operation.opcode === 'attach') {
    return {
      operation: 'attach',
      threadId: operation.threadId,
      threadType: operation.threadType
    }
  } else if (operation.opcode === 'update') {
    return {
      operation: 'update',
      threadId: operation.threadId,
      repliesCountOp: operation.updates.repliesCountOp,
      lastReply: operation.updates.lastReply
    }
  }
  return undefined
}
