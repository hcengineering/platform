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
  type Markdown,
  type SocialID,
  type CardType,
  type Label,
  type FindLabelsParams,
  type FindCollaboratorsParams,
  type Collaborator,
  type BlobData,
  type LinkPreviewData,
  type LinkPreviewID,
  PatchType
} from '@hcengineering/communication-types'
import {
  type CreateMessageEvent,
  type CreateMessageResult,
  type EventResult,
  type RemoveReactionEvent,
  type RequestEvent,
  type ResponseEvent,
  type UpdateNotificationContextEvent,
  type AddCollaboratorsEvent,
  type RemoveCollaboratorsEvent,
  MessageRequestEventType,
  NotificationRequestEventType,
  type RemoveNotificationContextEvent,
  type UpdateNotificationEvent,
  type UpdateNotificationQuery,
  type CreateLinkPreviewEvent,
  type RemoveLinkPreviewEvent,
  type AttachThreadEvent,
  type SetReactionEvent,
  type AttachBlobEvent,
  type DetachBlobEvent,
  type CreatePatchEvent
} from '@hcengineering/communication-sdk-types'
import {
  type Client as PlatformClient,
  type ClientConnection as PlatformConnection,
  getCurrentAccount,
  SocialIdType,
  generateId
} from '@hcengineering/core'
import { onDestroy } from 'svelte'
import {
  createMessagesQuery,
  createNotificationContextsQuery,
  createNotificationsQuery,
  createLabelsQuery,
  createCollaboratorsQuery,
  initLiveQueries,
  type MessageQueryParams
} from '@hcengineering/communication-client-query'

import { getCurrentWorkspaceUuid, getFilesUrl } from './file'

export {
  createMessagesQuery,
  createNotificationsQuery,
  createNotificationContextsQuery,
  createLabelsQuery,
  createCollaboratorsQuery
}
export type { MessageQueryParams }

interface Connection extends PlatformConnection {
  findMessages: (params: FindMessagesParams, queryId?: number) => Promise<Message[]>
  findMessagesGroups: (params: FindMessagesGroupsParams) => Promise<MessagesGroup[]>
  findNotificationContexts: (params: FindNotificationContextParams, queryId?: number) => Promise<NotificationContext[]>
  findNotifications: (params: FindNotificationsParams, queryId?: number) => Promise<Notification[]>
  findLabels: (params: FindLabelsParams) => Promise<Label[]>
  findCollaborators: (params: FindCollaboratorsParams, queryId?: number) => Promise<Collaborator[]>
  sendEvent: (event: RequestEvent) => Promise<EventResult>
  unsubscribeQuery: (id: number) => Promise<void>
}

let client: CommunicationClient

export type CommunicationClient = Client

export function getCommunicationClient (): CommunicationClient {
  return client
}

export async function setCommunicationClient (platformClient: PlatformClient): Promise<void> {
  const connection = platformClient.getConnection?.()
  if (connection === undefined) {
    return
  }
  client = new Client(connection as unknown as Connection)
  initLiveQueries(client, getCurrentWorkspaceUuid(), getFilesUrl(), onDestroy)
}

class Client {
  constructor (private readonly connection: Connection) {
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

  async attachThread (cardId: CardID, messageId: MessageID, threadId: CardID, threadType: CardType): Promise<void> {
    const event: AttachThreadEvent = {
      type: MessageRequestEventType.AttachThread,
      cardId,
      messageId,
      threadId,
      threadType,
      socialId: this.getSocialId()
    }

    await this.sendEvent(event)
  }

  async createMessage (cardId: CardID, cardType: CardType, content: Markdown): Promise<CreateMessageResult> {
    const event: CreateMessageEvent = {
      type: MessageRequestEventType.CreateMessage,
      messageType: MessageType.Message,
      cardId,
      cardType,
      content,
      socialId: this.getSocialId(),
      options: {
        skipLinkPreviews: true
      }
    }
    const result = await this.sendEvent(event)
    return result as CreateMessageResult
  }

  async updateMessage (cardId: CardID, messageId: MessageID, content: Markdown): Promise<void> {
    const event: CreatePatchEvent = {
      type: MessageRequestEventType.CreatePatch,
      patchType: PatchType.update,
      cardId,
      messageId,
      data: { content },
      socialId: this.getSocialId(),
      options: {
        skipLinkPreviewsUpdate: true
      }
    }
    await this.sendEvent(event)
  }

  async removeMessage (cardId: CardID, messageId: MessageID): Promise<void> {
    const event: CreatePatchEvent = {
      type: MessageRequestEventType.CreatePatch,
      patchType: PatchType.remove,
      cardId,
      messageId,
      data: {},
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async setReaction (cardId: CardID, messageId: MessageID, reaction: string): Promise<void> {
    const event: SetReactionEvent = {
      type: MessageRequestEventType.SetReaction,
      cardId,
      messageId,
      reaction,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async removeReaction (cardId: CardID, messageId: MessageID, reaction: string): Promise<void> {
    const event: RemoveReactionEvent = {
      type: MessageRequestEventType.RemoveReaction,
      cardId,
      messageId,
      reaction,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async addCollaborators (cardId: CardID, cardType: CardType, collaborators: AccountID[]): Promise<void> {
    const event: AddCollaboratorsEvent = {
      type: NotificationRequestEventType.AddCollaborators,
      cardId,
      cardType,
      collaborators,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async removeCollaborators (cardId: CardID, cardType: CardType, collaborators: AccountID[]): Promise<void> {
    const event: RemoveCollaboratorsEvent = {
      type: NotificationRequestEventType.RemoveCollaborators,
      cardId,
      cardType,
      collaborators,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async attachBlob (cardId: CardID, messageId: MessageID, blobData: BlobData): Promise<void> {
    const event: AttachBlobEvent = {
      type: MessageRequestEventType.AttachBlob,
      cardId,
      messageId,
      blobData,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async detachBlob (cardId: CardID, messageId: MessageID, blobId: BlobID): Promise<void> {
    const event: DetachBlobEvent = {
      type: MessageRequestEventType.DetachBlob,
      cardId,
      messageId,
      blobId,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async createLinkPreview (cardId: CardID, messageId: MessageID, previewData: LinkPreviewData): Promise<void> {
    const event: CreateLinkPreviewEvent = {
      type: MessageRequestEventType.CreateLinkPreview,
      cardId,
      messageId,
      previewData,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async removeLinkPreview (cardId: CardID, messageId: MessageID, previewId: LinkPreviewID): Promise<void> {
    const event: RemoveLinkPreviewEvent = {
      type: MessageRequestEventType.RemoveLinkPreview,
      cardId,
      messageId,
      previewId,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async updateNotificationContext (contextId: ContextID, lastView: Date): Promise<void> {
    const event: UpdateNotificationContextEvent = {
      type: NotificationRequestEventType.UpdateNotificationContext,
      contextId,
      account: this.getAccount(),
      updates: {
        lastView
      }
    }
    await this.sendEvent(event)
  }

  async removeNotificationContext (contextId: ContextID): Promise<void> {
    const event: RemoveNotificationContextEvent = {
      type: NotificationRequestEventType.RemoveNotificationContext,
      contextId,
      account: this.getAccount()
    }
    await this.sendEvent(event)
  }

  async updateNotifications (
    context: ContextID,
    query: Omit<UpdateNotificationQuery, 'context' | 'account'>,
    read: boolean
  ): Promise<void> {
    const event: UpdateNotificationEvent = {
      type: NotificationRequestEventType.UpdateNotification,
      query: {
        ...query,
        context,
        account: this.getAccount()
      },
      updates: {
        read
      }
    }
    await this.sendEvent(event)
  }

  async findMessages (params: FindMessagesParams, queryId?: number): Promise<Message[]> {
    return await this.connection.findMessages(params, queryId)
  }

  async findMessagesGroups (params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    const result = await this.connection.findMessagesGroups(params)
    console.log('findMessagesGroups result', [...result])
    return result
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

  async findCollaborators (params: FindCollaboratorsParams, queryId?: number): Promise<Collaborator[]> {
    return await this.connection.findCollaborators(params, queryId)
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
    const hulySocialId = me.fullSocialIds.find((it) => it.type === SocialIdType.HULY && it.verifiedOn !== undefined)
    const id = hulySocialId?._id ?? me.primarySocialId
    if (id == null || id === '') {
      throw new Error('Social id not found')
    }
    return id
  }

  private getAccount (): AccountID {
    return getCurrentAccount().uuid
  }
}
