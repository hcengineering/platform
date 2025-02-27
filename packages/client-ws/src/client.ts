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
  type CardID,
  type ContextID,
  type FindMessagesGroupsParams,
  type FindMessagesParams,
  type FindNotificationContextParams,
  type FindNotificationsParams,
  type Message,
  type MessageID,
  type MessagesGroup,
  type Notification,
  type NotificationContext,
  type NotificationContextUpdate,
  type RichText,
  type SocialID,
  type WorkspaceID
} from '@hcengineering/communication-types'
import {
  RequestEventType,
  type Client,
  type CreateAttachmentEvent,
  type CreateMessageEvent,
  type CreateMessageResult,
  type CreateNotificationContextEvent,
  type CreateNotificationContextResult,
  type CreateNotificationEvent,
  type CreatePatchEvent,
  type CreateReactionEvent,
  type EventResult,
  type RemoveAttachmentEvent,
  type RemoveMessageEvent,
  type RemoveNotificationContextEvent,
  type RemoveNotificationEvent,
  type RemoveReactionEvent,
  type RequestEvent,
  type ResponseEvent,
  type UpdateNotificationContextEvent
} from '@hcengineering/communication-sdk-types'
import { initLiveQueries } from '@hcengineering/communication-client-query'

import { WebSocketConnection } from './connection'

class WsClient implements Client {
  private readonly ws: WebSocketConnection

  onEvent: (event: ResponseEvent) => void = () => {}

  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly binary: boolean = false
  ) {
    const connectionUrl = this.url + '?token=' + this.token
    this.ws = new WebSocketConnection(connectionUrl, this.binary)
    this.ws.onEvent = (event) => {
      void this.onEvent(event)
    }
  }

  async createMessage(card: CardID, content: RichText, creator: SocialID): Promise<MessageID> {
    const event: CreateMessageEvent = {
      type: RequestEventType.CreateMessage,
      card,
      content,
      creator
    }
    const result = await this.sendEvent(event)
    return (result as CreateMessageResult).id
  }

  async removeMessage(card: CardID, message: MessageID): Promise<void> {
    const event: RemoveMessageEvent = {
      type: RequestEventType.RemoveMessage,
      card,
      message
    }
    await this.sendEvent(event)
  }

  async updateMessage(card: CardID, message: MessageID, content: RichText, creator: SocialID): Promise<void> {
    const event: CreatePatchEvent = {
      type: RequestEventType.CreatePatch,
      card,
      message,
      content,
      creator
    }
    await this.sendEvent(event)
  }

  async createReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    const event: CreateReactionEvent = {
      type: RequestEventType.CreateReaction,
      card,
      message,
      reaction,
      creator
    }
    await this.sendEvent(event)
  }

  async removeReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    const event: RemoveReactionEvent = {
      type: RequestEventType.RemoveReaction,
      card,
      message,
      reaction,
      creator
    }
    await this.sendEvent(event)
  }

  async createAttachment(card: CardID, message: MessageID, attachment: CardID, creator: SocialID): Promise<void> {
    const event: CreateAttachmentEvent = {
      type: RequestEventType.CreateAttachment,
      card,
      message,
      attachment,
      creator
    }
    await this.sendEvent(event)
  }

  async removeAttachment(card: CardID, message: MessageID, attachment: CardID): Promise<void> {
    const event: RemoveAttachmentEvent = {
      type: RequestEventType.RemoveAttachment,
      card,
      message,
      attachment
    }
    await this.sendEvent(event)
  }

  async findMessages(params: FindMessagesParams, queryId?: number): Promise<Message[]> {
    return await this.ws.send('findMessages', [params, queryId])
  }

  async findMessagesGroups(params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    return await this.ws.send('findMessagesGroups', [params])
  }

  async createNotification(message: MessageID, context: ContextID): Promise<void> {
    const event: CreateNotificationEvent = {
      type: RequestEventType.CreateNotification,
      message,
      context
    }
    await this.sendEvent(event)
  }

  async removeNotification(message: MessageID, context: ContextID): Promise<void> {
    const event: RemoveNotificationEvent = {
      type: RequestEventType.RemoveNotification,
      message,
      context
    }
    await this.sendEvent(event)
  }

  async createNotificationContext(card: CardID, lastView?: Date, lastUpdate?: Date): Promise<ContextID> {
    const event: CreateNotificationContextEvent = {
      type: RequestEventType.CreateNotificationContext,
      card,
      lastView,
      lastUpdate
    }
    const result = await this.sendEvent(event)
    return (result as CreateNotificationContextResult).id
  }

  async removeNotificationContext(context: ContextID): Promise<void> {
    const event: RemoveNotificationContextEvent = {
      type: RequestEventType.RemoveNotificationContext,
      context
    }
    await this.sendEvent(event)
  }

  async updateNotificationContext(context: ContextID, update: NotificationContextUpdate): Promise<void> {
    const event: UpdateNotificationContextEvent = {
      type: RequestEventType.UpdateNotificationContext,
      context,
      update
    }
    await this.sendEvent(event)
  }

  async findNotificationContexts(
    params: FindNotificationContextParams,
    queryId?: number
  ): Promise<NotificationContext[]> {
    return await this.ws.send('findNotificationContexts', [params, queryId])
  }

  async findNotifications(params: FindNotificationsParams, queryId?: number): Promise<Notification[]> {
    return await this.ws.send('findNotifications', [params, queryId])
  }

  async unsubscribeQuery(id: number): Promise<void> {
    await this.ws.send('unsubscribeQuery', [id])
  }

  private async sendEvent(event: RequestEvent): Promise<EventResult> {
    return await this.ws.send('event', [event])
  }
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createThread(card: CardID, message: MessageID, thread: CardID, created: Date): Promise<void> {
    //TODO: implement
  }

  close() {
    void this.ws.close()
  }
}

export async function getWebsocketClient(
  url: string,
  token: string,
  workspace: WorkspaceID,
  filesUrl: string
): Promise<Client> {
  const client = new WsClient(url, token)
  initLiveQueries(client, workspace, filesUrl)
  return client
}
