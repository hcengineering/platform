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

import { CardID, Message, Patch, PatchType, Reaction, SocialID } from '@hcengineering/communication-types'

export function applyPatches (message: Message, patches: Patch[]): Message {
  for (const patch of patches) {
    message = applyPatch(message, patch)
  }

  return message
}

// TODO: handle delete
function applyPatch (message: Message, patch: Patch): Message {
  switch (patch.type) {
    case PatchType.update:
      return {
        ...message,
        edited: patch.created,
        content: patch.content
      }
    case PatchType.addReaction:
      return addReaction(message, {
        message: message.id,
        reaction: patch.content,
        creator: patch.creator,
        created: patch.created
      })
    case PatchType.removeReaction:
      return removeReaction(message, patch.content, patch.creator)
    case PatchType.addReply:
      return addReply(message, patch.content as CardID, patch.created)
    case PatchType.removeReply:
      return removeReply(message, patch.content as CardID)
  }

  return message
}

function addReaction (message: Message, reaction: Reaction): Message {
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

function addReply (message: Message, thread: CardID, created: Date): Message {
  if (message.thread === undefined) {
    return {
      ...message,
      thread: {
        card: message.card,
        message: message.id,
        thread,
        repliesCount: 1,
        lastReply: created
      }
    }
  }

  if (message.thread.thread !== thread) return message

  return {
    ...message,
    thread: {
      ...message.thread,
      repliesCount: message.thread.repliesCount + 1,
      lastReply: created
    }
  }
}

function removeReply (message: Message, thread: CardID): Message {
  if (message.thread === undefined || message.thread.thread !== thread) return message

  return {
    ...message,
    thread: {
      ...message.thread,
      repliesCount: message.thread.repliesCount - 1
    }
  }
}
