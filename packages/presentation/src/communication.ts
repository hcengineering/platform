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
  type BlobData,
  type BlobID,
  type CardID,
  type CardType,
  type Collaborator,
  type ContextID,
  type FindCollaboratorsParams,
  type FindLabelsParams,
  type FindMessagesGroupsParams,
  type FindMessagesParams,
  type FindNotificationContextParams,
  type FindNotificationsParams,
  type Label,
  type LinkPreviewData,
  type LinkPreviewID,
  type Markdown,
  type Message,
  type MessageID,
  type MessagesGroup,
  MessageType,
  type Notification,
  type NotificationContext,
  type SocialID
} from '@hcengineering/communication-types'
import {
  type AddCollaboratorsEvent,
  type CreateMessageEvent,
  type CreateMessageResult,
  type EventResult,
  type RemoveCollaboratorsEvent,
  type RemoveNotificationContextEvent,
  type UpdateNotificationContextEvent,
  type UpdateNotificationEvent,
  type UpdateNotificationQuery,
  type Event,
  type ThreadPatchEvent,
  MessageEventType,
  type UpdatePatchEvent,
  type RemovePatchEvent,
  type ReactionPatchEvent,
  NotificationEventType,
  type BlobPatchEvent,
  type AttachBlobsOperation,
  type DetachBlobsOperation,
  type SetBlobsOperation,
  type LinkPreviewPatchEvent,
  type AttachLinkPreviewsOperation,
  type DetachLinkPreviewsOperation,
  type SetLinkPreviewsOperation
} from '@hcengineering/communication-sdk-types'
import {
  type Client as PlatformClient,
  type ClientConnection as PlatformConnection,
  generateId,
  getCurrentAccount,
  SocialIdType
} from '@hcengineering/core'
import { onDestroy } from 'svelte'
import {
  createCollaboratorsQuery,
  createLabelsQuery,
  createMessagesQuery,
  createNotificationContextsQuery,
  createNotificationsQuery,
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
  sendEvent: (event: Event) => Promise<EventResult>
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
  const _client = new Client(connection as unknown as Connection)
  initLiveQueries(_client, getCurrentWorkspaceUuid(), getFilesUrl(), onDestroy)
  client = _client
  onClientListeners.forEach((fn) => {
    fn()
  })
}

class Client {
  constructor (private readonly connection: Connection) {
    connection.pushHandler((...events: any[]) => {
      for (const event of events) {
        if (event != null && 'type' in event) {
          this.onEvent(event as Event)
        }
      }
    })
  }

  onEvent: (event: Event) => void = () => {}
  onRequest: (event: Event, eventPromise: Promise<EventResult>) => void = () => {}

  async attachThread (cardId: CardID, messageId: MessageID, threadId: CardID, threadType: CardType): Promise<void> {
    const event: ThreadPatchEvent = {
      type: MessageEventType.ThreadPatch,
      cardId,
      messageId,
      operation: {
        opcode: 'attach',
        threadId,
        threadType
      },
      socialId: this.getSocialId()
    }

    await this.sendEvent(event)
  }

  async createMessage (cardId: CardID, cardType: CardType, content: Markdown): Promise<CreateMessageResult> {
    const event: CreateMessageEvent = {
      type: MessageEventType.CreateMessage,
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
    const event: UpdatePatchEvent = {
      type: MessageEventType.UpdatePatch,
      cardId,
      messageId,
      content,
      socialId: this.getSocialId(),
      options: {
        skipLinkPreviewsUpdate: true
      }
    }
    await this.sendEvent(event)
  }

  async removeMessage (cardId: CardID, messageId: MessageID): Promise<void> {
    const event: RemovePatchEvent = {
      type: MessageEventType.RemovePatch,
      cardId,
      messageId,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async addReaction (cardId: CardID, messageId: MessageID, reaction: string): Promise<void> {
    const event: ReactionPatchEvent = {
      type: MessageEventType.ReactionPatch,
      cardId,
      messageId,
      operation: {
        opcode: 'add',
        reaction
      },
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async removeReaction (cardId: CardID, messageId: MessageID, reaction: string): Promise<void> {
    const event: ReactionPatchEvent = {
      type: MessageEventType.ReactionPatch,
      cardId,
      messageId,
      operation: {
        opcode: 'remove',
        reaction
      },
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async blobPatch (
    cardId: CardID,
    messageId: MessageID,
    ops: {
      attach?: BlobData[]
      detach?: BlobID[]
      set?: BlobData[]
    }
  ): Promise<void> {
    const operations: Array<AttachBlobsOperation | DetachBlobsOperation | SetBlobsOperation> = []

    if (ops.attach != null && ops.attach.length > 0) {
      operations.push({
        opcode: 'attach',
        blobs: ops.attach
      })
    }

    if (ops.detach != null && ops.detach.length > 0) {
      operations.push({
        opcode: 'detach',
        blobIds: ops.detach
      })
    }

    if (ops.set != null && ops.set.length > 0) {
      operations.push({
        opcode: 'set',
        blobs: ops.set
      })
    }

    if (operations.length === 0) return

    const event: BlobPatchEvent = {
      type: MessageEventType.BlobPatch,
      cardId,
      messageId,
      operations,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async linkPreviewPatch (
    cardId: CardID,
    messageId: MessageID,
    ops: {
      attach?: LinkPreviewData[]
      detach?: LinkPreviewID[]
      set?: LinkPreviewData[]
    }
  ): Promise<void> {
    const operations: Array<AttachLinkPreviewsOperation | DetachLinkPreviewsOperation | SetLinkPreviewsOperation> = []

    let count = 0
    if (ops.attach != null && ops.attach.length > 0) {
      operations.push({
        opcode: 'attach',
        previews: ops.attach.map((it) => ({
          ...it,
          // TODO: fix
          previewId: (Date.now() + count++).toString() as any as LinkPreviewID
        }))
      })
    }

    if (ops.detach != null && ops.detach.length > 0) {
      operations.push({
        opcode: 'detach',
        previewIds: ops.detach
      })
    }

    if (ops.set != null && ops.set.length > 0) {
      operations.push({
        opcode: 'set',
        previews: ops.set.map((it) => ({
          ...it,
          // TODO: fix
          previewId: (Date.now() + count++).toString() as any as LinkPreviewID
        }))
      })
    }

    if (operations.length === 0) return

    const event: LinkPreviewPatchEvent = {
      type: MessageEventType.LinkPreviewPatch,
      cardId,
      messageId,
      operations,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async addCollaborators (cardId: CardID, cardType: CardType, collaborators: AccountID[]): Promise<void> {
    const event: AddCollaboratorsEvent = {
      type: NotificationEventType.AddCollaborators,
      cardId,
      cardType,
      collaborators,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async removeCollaborators (cardId: CardID, cardType: CardType, collaborators: AccountID[]): Promise<void> {
    const event: RemoveCollaboratorsEvent = {
      type: NotificationEventType.RemoveCollaborators,
      cardId,
      cardType,
      collaborators,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async updateNotificationContext (contextId: ContextID, lastView: Date): Promise<void> {
    const event: UpdateNotificationContextEvent = {
      type: NotificationEventType.UpdateNotificationContext,
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
      type: NotificationEventType.RemoveNotificationContext,
      contextId,
      account: this.getAccount()
    }
    await this.sendEvent(event)
  }

  async updateNotifications (contextId: ContextID, query: UpdateNotificationQuery, read: boolean): Promise<void> {
    const event: UpdateNotificationEvent = {
      type: NotificationEventType.UpdateNotification,
      contextId,
      account: this.getAccount(),
      query,
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

  async findCollaborators (params: FindCollaboratorsParams, queryId?: number): Promise<Collaborator[]> {
    return await this.connection.findCollaborators(params, queryId)
  }

  async unsubscribeQuery (id: number): Promise<void> {
    await this.connection.unsubscribeQuery(id)
  }

  close (): void {
    // do nothing
  }

  private async sendEvent (event: Event): Promise<EventResult> {
    const ev: Event = { ...event, _id: generateId() }
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

const onClientListeners: Array<() => void> = []

export function onCommunicationClient (fn: () => void): void {
  onClientListeners.push(fn)
  if (client !== undefined) {
    setTimeout(() => {
      fn()
    })
  }
}
