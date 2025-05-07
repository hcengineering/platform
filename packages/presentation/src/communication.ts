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
  type AccountID,
  type BlobID,
  type CardID,
  type ContextID,
  type FindMessagesGroupsParams,
  type FindMessagesParams,
  type FindNotificationContextParams,
  type FindNotificationsParams,
  type Message,
  type MessageID,
  type MessagesGroup,
  MessageType,
  type Notification,
  type NotificationContext,
  PatchType,
  type RichText,
  type SocialID,
  type CardType,
  type Label,
  type FindLabelsParams
} from '@hcengineering/communication-types'
import {
  type CreateFileEvent,
  type CreateMessageEvent,
  type CreateMessageResult,
  type CreatePatchEvent,
  type CreateReactionEvent,
  type CreateThreadEvent,
  type EventResult,
  type RemoveFileEvent,
  type RemoveReactionEvent,
  type RequestEvent,
  type ResponseEvent,
  type UpdateNotificationContextEvent,
  type AddCollaboratorsEvent,
  MessageRequestEventType,
  NotificationRequestEventType
} from '@hcengineering/communication-sdk-types'
import {
  type Client as PlatformClient,
  type ClientConnection as PlatformConnection,
  getCurrentAccount,
  type SocialId,
  SocialIdType,
  generateId
} from '@hcengineering/core'
import { onDestroy } from 'svelte'
import {
  createMessagesQuery,
  createNotificationContextsQuery,
  createNotificationsQuery,
  createLabelsQuery,
  initLiveQueries,
  type MessageQueryParams
} from '@hcengineering/communication-client-query'

import { getCurrentWorkspaceUuid, getFilesUrl } from './file'

export { createMessagesQuery, createNotificationsQuery, createNotificationContextsQuery, createLabelsQuery }
export type { MessageQueryParams }

interface Connection extends PlatformConnection {
  findMessages: (params: FindMessagesParams, queryId?: number) => Promise<Message[]>
  findMessagesGroups: (params: FindMessagesGroupsParams) => Promise<MessagesGroup[]>
  findNotificationContexts: (params: FindNotificationContextParams, queryId?: number) => Promise<NotificationContext[]>
  findNotifications: (params: FindNotificationsParams, queryId?: number) => Promise<Notification[]>
  findLabels: (params: FindLabelsParams) => Promise<Label[]>
  sendEvent: (event: RequestEvent) => Promise<EventResult>
  unsubscribeQuery: (id: number) => Promise<void>
}

let client: CommunicationClient

export type CommunicationClient = Client

export function getCommunicationClient (): CommunicationClient {
  return client
}

export async function setCommunicationClient (platformClient: PlatformClient, socialIds: SocialId[]): Promise<void> {
  const connection = platformClient.getConnection?.()
  if (connection === undefined) {
    return
  }
  client = new Client(connection as unknown as Connection, socialIds)
  initLiveQueries(client, getCurrentWorkspaceUuid(), getFilesUrl(), onDestroy)
}

class Client {
  private readonly hulySocialId: SocialId | undefined

  constructor (
    private readonly connection: Connection,
    socialIds: SocialId[]
  ) {
    this.hulySocialId = socialIds.find((it) => it.type === SocialIdType.HULY && it.verifiedOn !== undefined)

    connection.pushHandler((...events: any[]) => {
      for (const event of events) {
        if (event != null && 'type' in event) {
          this.onEvent(event as ResponseEvent)
        }
      }
    })
  }

  onEvent: (event: ResponseEvent) => void = () => {}
  onRequest: (event: RequestEvent, eventPromise: Promise<EventResult>) => void = () => {}

  async createThread (card: CardID, message: MessageID, messageCreated: Date, thread: CardID): Promise<void> {
    const event: CreateThreadEvent = {
      type: MessageRequestEventType.CreateThread,
      card,
      message,
      messageCreated,
      thread
    }

    await this.sendEvent(event)
  }

  async createMessage (card: CardID, cardType: CardType, content: RichText): Promise<CreateMessageResult> {
    const event: CreateMessageEvent = {
      type: MessageRequestEventType.CreateMessage,
      messageType: MessageType.Message,
      card,
      cardType,
      content,
      creator: this.getSocialId()
    }
    const result = await this.sendEvent(event)
    return result as CreateMessageResult
  }

  async updateMessage (card: CardID, message: MessageID, messageCreated: Date, content: RichText): Promise<void> {
    const event: CreatePatchEvent = {
      type: MessageRequestEventType.CreatePatch,
      patchType: PatchType.update,
      card,
      message,
      messageCreated,
      content,
      creator: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async createReaction (card: CardID, message: MessageID, messageCreated: Date, reaction: string): Promise<void> {
    const event: CreateReactionEvent = {
      type: MessageRequestEventType.CreateReaction,
      card,
      message,
      messageCreated,
      reaction,
      creator: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async removeReaction (card: CardID, message: MessageID, messageCreated: Date, reaction: string): Promise<void> {
    const event: RemoveReactionEvent = {
      type: MessageRequestEventType.RemoveReaction,
      card,
      message,
      messageCreated,
      reaction,
      creator: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async addCollaborators (card: CardID, cardType: CardType, collaborators: AccountID[]): Promise<void> {
    const event: AddCollaboratorsEvent = {
      type: NotificationRequestEventType.AddCollaborators,
      card,
      cardType,
      collaborators
    }
    await this.sendEvent(event)
  }

  async createFile (
    card: CardID,
    message: MessageID,
    messageCreated: Date,
    blobId: BlobID,
    fileType: string,
    filename: string,
    size: number
  ): Promise<void> {
    const event: CreateFileEvent = {
      type: MessageRequestEventType.CreateFile,
      card,
      message,
      messageCreated,
      blobId,
      fileType,
      filename,
      size,
      creator: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async removeFile (card: CardID, message: MessageID, messageCreated: Date, blobId: BlobID): Promise<void> {
    const event: RemoveFileEvent = {
      type: MessageRequestEventType.RemoveFile,
      card,
      message,
      messageCreated,
      blobId,
      creator: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async updateNotificationContext (context: ContextID, lastView?: Date): Promise<void> {
    const event: UpdateNotificationContextEvent = {
      type: NotificationRequestEventType.UpdateNotificationContext,
      context,
      account: this.getAccount(),
      lastView
    }
    await this.sendEvent(event)
  }

  async findMessages (params: FindMessagesParams, queryId?: number): Promise<Message[]> {
    return await this.connection.findMessages(params, queryId)
  }

  async findMessagesGroups (params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    return await this.connection.findMessagesGroups(params)
  }

  async findNotificationContexts (
    params: FindNotificationContextParams,
    queryId?: number
  ): Promise<NotificationContext[]> {
    return await this.connection.findNotificationContexts(params, queryId)
  }

  async findNotifications (params: FindNotificationsParams, queryId?: number): Promise<Notification[]> {
    return await this.connection.findNotifications(params, queryId)
  }

  async findLabels (params: FindLabelsParams): Promise<Label[]> {
    return await this.connection.findLabels(params)
  }

  async unsubscribeQuery (id: number): Promise<void> {
    await this.connection.unsubscribeQuery(id)
  }

  close (): void {
    // do nothing
  }

  private async sendEvent (event: RequestEvent): Promise<EventResult> {
    const ev: RequestEvent = { ...event, _id: generateId() }
    const eventPromise = this.connection.sendEvent(ev)
    this.onRequest(ev, eventPromise)
    return await eventPromise
  }

  private getSocialId (): SocialID {
    const me = getCurrentAccount()
    const id = this.hulySocialId?._id ?? me.primarySocialId
    if (id == null || id === '') {
      throw new Error('Social id not found')
    }
    return id
  }

  private getAccount (): AccountID {
    return getCurrentAccount().uuid
  }
}
