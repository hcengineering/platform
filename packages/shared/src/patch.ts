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
  PatchType,
  type BlobID,
  type Message,
  type Patch,
  type Reaction,
  type SocialID,
  type AttachBlobPatchData,
  type UpdateThreadPatchData
} from '@hcengineering/communication-types'

export function applyPatches (message: Message, patches: Patch[], allowedPatchTypes: PatchType[] = []): Message {
  if (patches.length === 0) return message

  for (const p of patches) {
    message = applyPatch(message, p, allowedPatchTypes)
  }
  return message
}

export function applyPatch (message: Message, patch: Patch, allowedPatchTypes: PatchType[] = []): Message {
  if ((allowedPatchTypes.length > 0 && !allowedPatchTypes.includes(patch.type)) || message.removed) return message
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
    case PatchType.remove:
      return {
        ...message,
        content: '',
        blobs: [],
        linkPreviews: [],
        reactions: [],
        removed: true
      }
    case PatchType.setReaction:
      return setReaction(message, {
        reaction: patch.data.reaction,
        creator: patch.creator,
        created: patch.created
      })
    case PatchType.removeReaction:
      return removeReaction(message, patch.data.reaction, patch.creator)
    case PatchType.attachBlob:
      return attachBlob(message, patch.data, patch.created, patch.creator)
    case PatchType.detachBlob:
      return detachBlob(message, patch.data.blobId)
    case PatchType.updateThread:
      return updateThread(message, patch.data, patch.created)
  }

  return message
}

function setReaction (message: Message, reaction: Reaction): Message {
  const isExist = message.reactions.some((it) => it.reaction === reaction.reaction && it.creator === reaction.creator)
  if (isExist) return message
  message.reactions.push(reaction)
  return message
}

function removeReaction (message: Message, emoji: string, creator: SocialID): Message {
  const reactions = message.reactions.filter((it) => it.reaction !== emoji || it.creator !== creator)
  if (reactions.length === message.reactions.length) return message

  return {
    ...message,
    reactions
  }
}

function updateThread (message: Message, data: UpdateThreadPatchData, created: Date): Message {
  const thread = message.thread ?? {
    cardId: message.cardId,
    messageId: message.id,
    threadId: data.threadId,
    threadType: data.threadType,
    repliesCount: 0,
    lastReply: created
  }

  thread.threadId = data.threadId
  thread.threadType = data.threadType

  if (data.repliesCountOp === 'increment') {
    thread.repliesCount = thread.repliesCount + 1
    thread.lastReply = created
  }

  if (data.repliesCountOp === 'decrement') {
    thread.repliesCount = Math.max(thread.repliesCount - 1, 0)
  }

  return {
    ...message,
    thread
  }
}

function attachBlob (message: Message, data: AttachBlobPatchData, created: Date, creator: SocialID): Message {
  const isExists = message.blobs.some((it) => it.blobId === data.blobId)
  if (isExists !== undefined) return message
  message.blobs.push({
    ...data,
    created,
    creator
  })
  return message
}

function detachBlob (message: Message, blobId: BlobID): Message {
  const blobs = message.blobs.filter((it) => it.blobId !== blobId)
  if (blobs.length === message.blobs.length) return message

  return {
    ...message,
    blobs
  }
}
