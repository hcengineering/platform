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
  BlobData,
  BlobID,
  BlobPatch,
  CardID,
  CardType,
  LinkPreview,
  LinkPreviewData,
  LinkPreviewID,
  LinkPreviewPatch,
  type Message,
  type Patch,
  PatchType,
  ReactionPatch,
  SocialID,
  ThreadPatch,
  BlobUpdateData
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
        blobs: [],
        linkPreviews: [],
        reactions: [],
        removed: true
      }
    }
    case PatchType.reaction:
      return patchReactions(message, patch)
    case PatchType.blob:
      return patchBlobs(message, patch)
    case PatchType.linkPreview:
      return patchLinkPreviews(message, patch)
    case PatchType.thread:
      return patchThread(message, patch)
  }
}

function patchBlobs (message: Message, patch: BlobPatch): Message {
  if (patch.data.operation === 'attach') {
    return attachBlobs(message, patch.data.blobs, patch.created, patch.creator)
  } else if (patch.data.operation === 'detach') {
    return detachBlobs(message, patch.data.blobIds)
  } else if (patch.data.operation === 'set') {
    return setBlobs(message, patch.data.blobs, patch.created, patch.creator)
  } else if (patch.data.operation === 'update') {
    return updateBlobs(message, patch.data.blobs)
  }
  return message
}

function patchLinkPreviews (message: Message, patch: LinkPreviewPatch): Message {
  if (patch.data.operation === 'attach') {
    return attachLinkPreviews(message, patch.data.previews, patch.created, patch.creator)
  } else if (patch.data.operation === 'detach') {
    return detachLinkPreviews(message, patch.data.previewIds)
  } else if (patch.data.operation === 'set') {
    return setLinkPreviews(message, patch.data.previews, patch.created, patch.creator)
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

function attachBlobs (message: Message, data: BlobData[], created: Date, creator: SocialID): Message {
  const newBlobs = []
  for (const blob of data) {
    const isExists = message.blobs.some((it) => it.blobId === blob.blobId)
    if (isExists === undefined) continue
    newBlobs.push({
      ...blob,
      created,
      creator
    })
  }

  if (newBlobs.length === 0) return message
  return {
    ...message,
    blobs: [...message.blobs, ...newBlobs]
  }
}

function updateBlobs (message: Message, updates: BlobUpdateData[]): Message {
  if (updates.length === 0) return message
  const updatedBlobs = []
  for (const blob of message.blobs) {
    const update = updates.find((it) => it.blobId === blob.blobId)
    if (update === undefined) {
      updatedBlobs.push(blob)
    } else {
      updatedBlobs.push({
        ...blob,
        ...update
      })
    }
  }

  return {
    ...message,
    blobs: updatedBlobs
  }
}

function detachBlobs (message: Message, blobIds: BlobID[]): Message {
  const blobs = message.blobs.filter((it) => !blobIds.includes(it.blobId))
  if (blobs.length === message.blobs.length) return message

  return {
    ...message,
    blobs
  }
}

function setBlobs (message: Message, data: BlobData[], created: Date, creator: SocialID): Message {
  if (data.length === 0) return message
  return {
    ...message,
    blobs: data.map((it) => ({
      ...it,
      created,
      creator
    }))
  }
}

function attachLinkPreviews (
  message: Message,
  previews: (LinkPreviewData & { previewId: LinkPreviewID })[],
  created: Date,
  creator: SocialID
): Message {
  const newPreviews: LinkPreview[] = []
  for (const preview of previews) {
    if (message.linkPreviews.some((it) => it.id === preview.previewId)) continue
    newPreviews.push({
      id: preview.previewId,
      ...preview,
      created,
      creator
    })
  }

  if (newPreviews.length === 0) return message
  return {
    ...message,
    linkPreviews: [...message.linkPreviews, ...newPreviews]
  }
}

function detachLinkPreviews (message: Message, previewIds: LinkPreviewID[]): Message {
  const previews = message.linkPreviews.filter((it) => !previewIds.includes(it.id))
  if (previews.length === message.linkPreviews.length) return message

  return {
    ...message,
    linkPreviews: previews
  }
}

function setLinkPreviews (
  message: Message,
  previews: (LinkPreviewData & { previewId: LinkPreviewID })[],
  created: Date,
  creator: SocialID
): Message {
  if (previews.length === 0) return message
  const newPreviews: LinkPreview[] = []
  for (const preview of previews) {
    if (message.linkPreviews.some((it) => it.id === preview.previewId)) continue
    newPreviews.push({
      id: preview.previewId,
      ...preview,
      created,
      creator
    })
  }

  return {
    ...message,
    linkPreviews: newPreviews
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
