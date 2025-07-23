//
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
//

import {
  CardID,
  CardType,
  type Message,
  type Patch,
  PatchType,
  ReactionPatch,
  SocialID,
  ThreadPatch,
  AttachmentData,
  AttachmentPatch,
  AttachmentUpdateData,
  AttachmentID,
  Attachment
} from '@hcengineering/communication-types'

export function applyPatches (message: Message, patches: Patch[], allowedPatchTypes: PatchType[] = []): Message {
  if (patches.length === 0) return message

  for (const p of patches) {
    message = applyPatch(message, p, allowedPatchTypes)
  }
  return message
}

export function applyPatch (message: Message, patch: Patch, allowedPatchTypes: PatchType[] = []): Message {
  if ((allowedPatchTypes.length > 0 && !allowedPatchTypes.includes(patch.type)) || message.removed) {
    return message
  }

  switch (patch.type) {
    case PatchType.update: {
      if (patch.created.getTime() < (message.edited?.getTime() ?? 0)) {
        return message
      }
      return {
        ...message,
        edited: patch.created,
        content: patch.data.content ?? message.content,
        extra: patch.data.extra ?? message.extra
      }
    }
    case PatchType.remove: {
      return {
        ...message,
        content: '',
        attachments: [],
        reactions: [],
        removed: true
      }
    }
    case PatchType.reaction:
      return patchReactions(message, patch)
    case PatchType.attachment:
      return patchAttachments(message, patch)
    case PatchType.thread:
      return patchThread(message, patch)
  }
}

function patchAttachments (message: Message, patch: AttachmentPatch): Message {
  if (patch.data.operation === 'add') {
    return addAttachments(message, patch.data.attachments, patch.created, patch.creator)
  } else if (patch.data.operation === 'remove') {
    return removeAttachments(message, patch.data.ids)
  } else if (patch.data.operation === 'set') {
    return setAttachments(message, patch.data.attachments, patch.created, patch.creator)
  } else if (patch.data.operation === 'update') {
    return updateAttachments(message, patch.data.attachments, patch.created)
  }
  return message
}

function patchReactions (message: Message, patch: ReactionPatch): Message {
  if (patch.data.operation === 'add') {
    return setReaction(message, patch.data.reaction, patch.creator, patch.created)
  } else if (patch.data.operation === 'remove') {
    return removeReaction(message, patch.data.reaction, patch.creator)
  }
  return message
}

function setReaction (message: Message, reaction: string, creator: SocialID, created: Date): Message {
  const isExist = message.reactions.some((it) => it.reaction === reaction && it.creator === creator)
  if (isExist) return message
  message.reactions.push({
    reaction,
    creator,
    created
  })
  return message
}

function removeReaction (message: Message, reaction: string, creator: SocialID): Message {
  const reactions = message.reactions.filter((it) => it.reaction !== reaction || it.creator !== creator)
  if (reactions.length === message.reactions.length) return message

  return {
    ...message,
    reactions
  }
}

function addAttachments (message: Message, data: AttachmentData[], created: Date, creator: SocialID): Message {
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

function setAttachments (message: Message, data: AttachmentData[], created: Date, creator: SocialID): Message {
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

function patchThread (message: Message, patch: ThreadPatch): Message {
  if (patch.data.operation === 'attach') {
    return attachThread(message, patch.data.threadId, patch.data.threadType)
  } else if (patch.data.operation === 'update') {
    return updateThread(
      message,
      patch.data.threadId,
      patch.data.threadType,
      patch.data.repliesCountOp,
      patch.data.lastReply
    )
  }
  return message
}

function attachThread (message: Message, threadId: CardID, threadType: CardType): Message {
  if (message.thread !== undefined) return message
  return {
    ...message,
    thread: {
      cardId: message.cardId,
      messageId: message.id,
      threadId,
      threadType,
      repliesCount: 0,
      lastReply: new Date()
    }
  }
}

function updateThread (
  message: Message,
  threadId: CardID,
  threadType?: CardType,
  repliesCountOp?: 'increment' | 'decrement',
  lastReply?: Date
): Message {
  if (repliesCountOp === undefined && lastReply === undefined) return message
  if (message.thread === undefined) return message
  if (message.thread.threadId !== threadId) return message

  let count = message.thread.repliesCount
  if (repliesCountOp === 'increment') {
    count = count + 1
  }

  if (repliesCountOp === 'decrement') {
    count = Math.max(count - 1, 0)
  }

  return {
    ...message,
    thread: {
      ...message.thread,
      repliesCount: count,
      threadType: threadType ?? message.thread.threadType,
      lastReply: lastReply ?? message.thread.lastReply
    }
  }
}
