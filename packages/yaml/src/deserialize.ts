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

export function deserializeMessage (message: Message): FileMessage {
  return {
    id: message.id,
    type: message.type,
    content: message.content,
    edited: message.edited,
    creator: message.creator,
    created: message.created,
    removed: message.removed,
    extra: message.extra,
    thread:
      message.thread != null
        ? {
            threadId: message.thread.threadId,
            threadType: message.thread.threadType,
            repliesCount: message.thread.repliesCount,
            lastReply: message.thread.lastReply
          }
        : undefined,
    blobs: message.blobs,
    reactions: message.reactions,
    linkPreviews: message.linkPreviews
  }
}
