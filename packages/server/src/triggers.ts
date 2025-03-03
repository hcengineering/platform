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
  type ConnectionInfo,
  type PatchCreatedEvent,
  type MessagesGroupCreatedEvent
} from '@hcengineering/communication-sdk-types'
import { type WorkspaceID, PatchType, type Patch, type CardID } from '@hcengineering/communication-types'
import { concatLink, systemAccountUuid } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'

import type { Metadata } from './metadata.ts'

export class Triggers {
  private readonly registeredCards: Set<CardID> = new Set()

  constructor(
    private readonly metadata: Metadata,
    private readonly db: DbAdapter,
    private readonly workspace: WorkspaceID
  ) {}

  async process(event: ResponseEvent, info: ConnectionInfo): Promise<ResponseEvent[]> {
    try {
      switch (event.type) {
        case ResponseEventType.MessageCreated:
          return await this.onMessageCreated(event)
        case ResponseEventType.MessageRemoved:
          return await this.onMessageRemoved(event, info)
        case ResponseEventType.PatchCreated:
          return await this.onPatchCreated(event, info)
        case ResponseEventType.MessagesGroupCreated:
          return await this.onMessagesGroupCreated(event)
      }
    } catch (err: any) {
      console.error(err)
      return []
    }

    return []
  }

  async onMessagesGroupCreated(event: MessagesGroupCreatedEvent): Promise<ResponseEvent[]> {
    this.registeredCards.delete(event.group.card)
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
    return (await Promise.all([this.registerCard(event.message.card), this.updateThread(event)])).flat()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async onPatchCreated(event: PatchCreatedEvent, info: ConnectionInfo): Promise<ResponseEvent[]> {
    return this.registerCard(event.card)
  }

  async updateThread(event: MessageCreatedEvent): Promise<ResponseEvent[]> {
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

  async registerCard(card: CardID): Promise<ResponseEvent[]> {
    if (this.registeredCards.has(card) || this.metadata.msg2fileUrl === '') return []

    try {
      const token = generateToken(systemAccountUuid, this.workspace)
      await fetch(concatLink(this.metadata.msg2fileUrl, '/register/:card').replaceAll(':card', card), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        }
      })
      this.registeredCards.add(card)
    } catch (e) {
      console.error(e)
    }

    return []
  }
}
