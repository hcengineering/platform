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
  type ConnectionInfo,
  type CreatePatchEvent,
  type DbAdapter,
  type EventResult,
  type FileCreatedEvent,
  type FileRemovedEvent,
  type MessageCreatedEvent,
  type MessagesGroupCreatedEvent,
  type MessagesRemovedEvent,
  type PatchCreatedEvent,
  type RequestEvent,
  RequestEventType,
  type ResponseEvent,
  ResponseEventType,
  type UpdateThreadEvent
} from '@hcengineering/communication-sdk-types'
import { type CardID, PatchType, type WorkspaceID, type File } from '@hcengineering/communication-types'
import { concatLink, type MeasureContext, systemAccountUuid } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'

import type { Metadata } from './metadata.ts'
import { notify } from './notification/notification'
import { type TriggerCtx } from './types.js'
import { findAccount } from './utils'

export class Triggers {
  private readonly registeredCards = new Set<CardID>()

  constructor(
    private readonly ctx: MeasureContext,
    private readonly metadata: Metadata,
    private readonly db: DbAdapter,
    private readonly workspace: WorkspaceID
  ) {}

  async process(
    event: ResponseEvent,
    info: ConnectionInfo,
    apply: (events: RequestEvent[]) => Promise<void>,
    execute: (event: RequestEvent) => Promise<EventResult>
  ): Promise<void> {
    const ctx: TriggerCtx = {
      ctx: this.ctx,
      metadata: this.metadata,
      db: this.db,
      workspace: this.workspace,
      account: info.account,
      execute
    }

    await this.applySyncTriggers(ctx, event, apply)

    void this.createNotification(ctx, event).then((it) => {
      void apply(it)
    })
  }

  private async applySyncTriggers(
    ctx: TriggerCtx,
    event: ResponseEvent,
    apply: (events: RequestEvent[]) => Promise<void>
  ): Promise<void> {
    let events: RequestEvent[] = []

    try {
      switch (event.type) {
        case ResponseEventType.MessageCreated: {
          events = await this.onMessageCreated(ctx, event)
          break
        }
        case ResponseEventType.MessagesRemoved: {
          events = await this.onMessagesRemoved(ctx, event)
          break
        }
        case ResponseEventType.PatchCreated: {
          events = await this.onPatchCreated(ctx, event)
          break
        }
        case ResponseEventType.FileCreated: {
          events = await this.onFileCreated(ctx, event)
          break
        }
        case ResponseEventType.FileRemoved: {
          events = await this.onFileRemoved(ctx, event)
          break
        }
        case ResponseEventType.MessagesGroupCreated: {
          events = await this.onMessagesGroupCreated(ctx, event)
          break
        }
      }
      await apply(events)
    } catch (err: any) {
      console.error(err)
    }
  }

  private async createNotification(ctx: TriggerCtx, event: ResponseEvent): Promise<RequestEvent[]> {
    return await notify(ctx, event)
  }

  private async onMessagesGroupCreated(_: TriggerCtx, event: MessagesGroupCreatedEvent): Promise<RequestEvent[]> {
    this.registeredCards.delete(event.group.card)
    return []
  }

  private async onMessagesRemoved(ctx: TriggerCtx, event: MessagesRemovedEvent): Promise<RequestEvent[]> {
    const { card } = event
    const thread = await this.db.findThread(card)
    if (thread === undefined) return []

    const socialId = ctx.account.primarySocialId

    return event.messages.flatMap(() => {
      const patchEvent: CreatePatchEvent = {
        type: RequestEventType.CreatePatch,
        patchType: PatchType.removeReply,
        card: thread.card,
        message: thread.message,
        content: thread.thread,
        creator: socialId
      }
      const threadEvent: UpdateThreadEvent = {
        type: RequestEventType.UpdateThread,
        thread: thread.thread,
        replies: 'decrement'
      }

      return [patchEvent, threadEvent]
    })
  }

  private async onMessageCreated(ctx: TriggerCtx, event: MessageCreatedEvent): Promise<RequestEvent[]> {
    void this.registerCard(event.message.card)

    return [...(await this.addCollaborators(ctx, event)), ...(await this.addThreadReply(event))]
  }

  private async addCollaborators(ctx: TriggerCtx, event: MessageCreatedEvent): Promise<RequestEvent[]> {
    const { creator } = event.message
    const account = await findAccount(ctx, creator)

    if (account === undefined) {
      return []
    }

    const collaborator = (
      await this.db.findCollaborators({
        card: event.message.card,
        account,
        limit: 1
      })
    )[0]

    return collaborator != null
      ? []
      : [
          {
            type: RequestEventType.AddCollaborators,
            card: event.message.card,
            collaborators: [account],
            date: event.message.created
          }
        ]
  }

  private async onPatchCreated(_: TriggerCtx, event: PatchCreatedEvent): Promise<RequestEvent[]> {
    void this.registerCard(event.card)
    return []
  }

  private async addThreadReply(event: MessageCreatedEvent): Promise<RequestEvent[]> {
    const { message } = event
    const thread = await this.db.findThread(message.card)
    if (thread === undefined) {
      return []
    }

    return [
      {
        type: RequestEventType.CreatePatch,
        patchType: PatchType.addReply,
        card: thread.card,
        message: thread.message,
        content: thread.thread,
        creator: message.creator
      },
      {
        type: RequestEventType.UpdateThread,
        thread: thread.thread,
        lastReply: event.message.created,
        replies: 'increment'
      }
    ]
  }

  private async onFileCreated(_: TriggerCtx, event: FileCreatedEvent): Promise<RequestEvent[]> {
    const message = (await this.db.findMessages({ card: event.card, id: event.file.message, limit: 1 }))[0]
    if (message !== undefined) return []

    const { file } = event
    const patchContent: Omit<File, 'card' | 'message' | 'created' | 'creator'> = {
      blobId: file.blobId,
      type: file.type,
      filename: file.filename,
      size: file.size
    }

    return [
      {
        type: RequestEventType.CreatePatch,
        patchType: PatchType.addFile,
        card: event.card,
        message: file.message,
        content: JSON.stringify(patchContent),
        creator: file.creator
      }
    ]
  }

  private async onFileRemoved(_: TriggerCtx, event: FileRemovedEvent): Promise<RequestEvent[]> {
    const message = (await this.db.findMessages({ card: event.card, id: event.message, limit: 1 }))[0]
    if (message !== undefined) return []
    const { blobId } = event

    return [
      {
        type: RequestEventType.CreatePatch,
        patchType: PatchType.removeFile,
        card: event.card,
        message: event.message,
        content: JSON.stringify({ blobId }),
        creator: event.creator
      }
    ]
  }

  private async registerCard(card: CardID): Promise<void> {
    if (this.registeredCards.has(card) || this.metadata.msg2fileUrl === '') {
      return
    }

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
  }
}
