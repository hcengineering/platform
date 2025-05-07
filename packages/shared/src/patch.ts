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
  type AddFilePatchData,
  type UpdateThreadPatchData
} from '@hcengineering/communication-types'

export function applyPatches(message: Message, patches: Patch[], allowedPatchTypes: PatchType[] = []): Message {
  if (patches.length === 0) return message

  for (const p of patches) {
    message = applyPatch(message, p, allowedPatchTypes)
  }
  return message
}

export function applyPatch(message: Message, patch: Patch, allowedPatchTypes: PatchType[] = []): Message {
  if (allowedPatchTypes.length > 0 && !allowedPatchTypes.includes(patch.type)) return message
  switch (patch.type) {
    case PatchType.update:
      return {
        ...message,
        edited: patch.created,
        content: patch.data.content ?? message.content,
        data: patch.data.data ?? message.data
      }
    case PatchType.addReaction:
      return addReaction(message, {
        message: message.id,
        reaction: patch.data.reaction,
        creator: patch.creator,
        created: patch.created
      })
    case PatchType.removeReaction:
      return removeReaction(message, patch.data.reaction, patch.creator)
    case PatchType.addFile:
      return addFile(message, patch.data, patch.created, patch.creator)
    case PatchType.removeFile:
      return removeFile(message, patch.data.blobId)
    case PatchType.updateThread:
      return updateThread(message, patch.data, patch.created)
  }

  return message
}

function addReaction(message: Message, reaction: Reaction): Message {
  message.reactions.push(reaction)
  return message
}

function removeReaction(message: Message, emoji: string, creator: SocialID): Message {
  const reactions = message.reactions.filter((it) => it.reaction !== emoji || it.creator !== creator)
  if (reactions.length === message.reactions.length) return message

  return {
    ...message,
    reactions
  }
}

function updateThread(message: Message, data: UpdateThreadPatchData, created: Date): Message {
  const thread = message.thread ?? {
    card: message.card,
    message: message.id,
    messageCreated: message.created,
    thread: data.thread,
    threadType: data.threadType,
    repliesCount: 0,
    lastReply: created
  }

  thread.thread = data.thread
  thread.threadType = data.threadType

  if (data.replies === 'increment') {
    thread.repliesCount = thread.repliesCount + 1
    thread.lastReply = created
  }

  if (data.replies === 'decrement') {
    thread.repliesCount = Math.max(thread.repliesCount - 1, 0)
  }

  return {
    ...message,
    thread
  }
}

function addFile(message: Message, data: AddFilePatchData, created: Date, creator: SocialID): Message {
  message.files.push({
    ...data,
    card: message.card,
    message: message.id,
    created,
    creator,
    messageCreated: message.created
  })
  return message
}

function removeFile(message: Message, blobId: BlobID): Message {
  const files = message.files.filter((it) => it.blobId !== blobId)
  if (files.length === message.files.length) return message

  return {
    ...message,
    files
  }
}
