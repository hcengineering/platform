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

import type { FileMessage, Message } from '@hcengineering/communication-types'

export function deserializeMessage(message: Message): FileMessage {
  return {
    id: message.id,
    type: message.type,
    content: message.content,
    edited: message.edited,
    creator: message.creator,
    created: message.created,
    data: message.data,
    thread:
      message.thread != null
        ? {
            thread: message.thread.thread,
            repliesCount: message.thread.repliesCount,
            lastReply: message.thread.lastReply
          }
        : undefined,
    files: message.files.map((file) => ({
      blobId: file.blobId,
      type: file.type,
      filename: file.filename,
      size: file.size,
      created: file.created,
      creator: file.creator
    })),
    reactions: message.reactions.map((reaction) => ({
      reaction: reaction.reaction,
      creator: reaction.creator,
      created: reaction.created
    }))
  }
}
