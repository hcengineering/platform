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
  type MessageCreatedEvent,
  type DbAdapter,
  type ResponseEvent,
  ResponseEventType,
  type MessageRemovedEvent,
  type ConnectionInfo
} from '@hcengineering/communication-sdk-types'
import { type WorkspaceID, PatchType, type Patch } from '@hcengineering/communication-types'

export class Triggers {
  constructor(
    private readonly db: DbAdapter,
    private readonly workspace: WorkspaceID
  ) {}

  async process(event: ResponseEvent, info: ConnectionInfo): Promise<ResponseEvent[]> {
    switch (event.type) {
      case ResponseEventType.MessageCreated:
        return await this.onMessageCreated(event)
      case ResponseEventType.MessageRemoved:
        return await this.onMessageRemoved(event, info)
    }
    return []
  }

  async onMessageRemoved(event: MessageRemovedEvent, info: ConnectionInfo): Promise<ResponseEvent[]> {
    const { card } = event
    const thread = await this.db.findThread(card)
    if (thread === undefined) return []

    const date = new Date()
    const socialId = info.socialIds[0]

    const patch: Patch = {
      message: thread.message,
      type: PatchType.removeReply,
      content: thread.thread,
      creator: socialId,
      created: date
    }
    await this.db.updateThread(thread.thread, date, 'decrement')
    await this.db.createPatch(thread.card, patch.message, patch.type, patch.content, patch.creator, patch.created)

    return [
      {
        type: ResponseEventType.PatchCreated,
        card: thread.card,
        patch
      }
    ]
  }

  async onMessageCreated(event: MessageCreatedEvent): Promise<ResponseEvent[]> {
    const { message } = event
    const thread = await this.db.findThread(message.card)
    if (thread === undefined) return []

    const date = new Date()
    const patch: Patch = {
      message: thread.message,
      type: PatchType.addReply,
      content: thread.thread,
      creator: message.creator,
      created: date
    }
    await this.db.updateThread(thread.thread, date, 'increment')
    await this.db.createPatch(thread.card, patch.message, patch.type, patch.content, patch.creator, patch.created)

    return [
      {
        type: ResponseEventType.PatchCreated,
        card: thread.card,
        patch
      }
    ]
  }
}
