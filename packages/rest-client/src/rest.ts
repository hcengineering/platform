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

import { concatLink } from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import {
  MessageRequestEventType,
  type EventResult,
  type RequestEvent,
  type CreateMessageResult,
  type RemoveMessagesResult
} from '@hcengineering/communication-sdk-types'
import {
  type FindMessagesGroupsParams,
  type FindMessagesParams,
  type FindNotificationContextParams,
  type Message,
  type MessagesGroup,
  type NotificationContext,
  type FindNotificationsParams,
  type Notification,
  type MessageID,
  type CardID,
  type RichText,
  type SocialID,
  type MessageData,
  type CardType,
  type MessageType,
  PatchType,
  type BlobID
} from '@hcengineering/communication-types'
import { retry } from '@hcengineering/communication-shared'

import { extractJson } from './utils'
import type { RestClient } from './types'

const retries = 3

export function createRestClient(endpoint: string, workspaceId: string, token: string): RestClient {
  return new RestClientImpl(endpoint, workspaceId, token)
}

class RestClientImpl implements RestClient {
  endpoint: string

  constructor(
    endpoint: string,
    readonly workspace: string,
    readonly token: string
  ) {
    this.endpoint = endpoint.replace('ws', 'http')
  }

  private jsonHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + this.token,
      'accept-encoding': 'snappy, gzip'
    }
  }

  private requestInit(): RequestInit {
    return {
      method: 'GET',
      keepalive: true,
      headers: this.jsonHeaders()
    }
  }

  async event(event: RequestEvent): Promise<EventResult> {
    const response = await fetch(concatLink(this.endpoint, `/api/v1/event/${this.workspace}`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.token
      },
      keepalive: true,
      body: JSON.stringify(event)
    })
    if (!response.ok) {
      throw new PlatformError(unknownError(response.statusText))
    }
    return (await response.json()) as EventResult
  }

  async createMessage(
    card: CardID,
    cardType: CardType,
    content: RichText,
    creator: SocialID,
    type: MessageType,
    data?: MessageData
  ): Promise<MessageID> {
    const result = await this.event({
      type: MessageRequestEventType.CreateMessage,
      messageType: type,
      card,
      cardType,
      content,
      creator,
      data
    })
    return (result as CreateMessageResult).id
  }

  async updateMessage(card: CardID, message: MessageID, content: RichText, creator: SocialID): Promise<void> {
    await this.event({
      type: MessageRequestEventType.CreatePatch,
      patchType: PatchType.update,
      card,
      message,
      content,
      creator
    })
  }

  async removeMessage(card: CardID, message: MessageID): Promise<MessageID | undefined> {
    return (await this.removeMessages(card, [message]))[0]
  }

  async removeMessages(card: CardID, messages: MessageID[]): Promise<MessageID[]> {
    const result = await this.event({
      type: MessageRequestEventType.RemoveMessages,
      card,
      messages
    })

    return (result as RemoveMessagesResult).messages
  }

  async createFile(
    card: CardID,
    message: MessageID,
    blobId: BlobID,
    fileType: string,
    filename: string,
    size: number,
    creator: SocialID
  ): Promise<void> {
    await this.event({
      type: MessageRequestEventType.CreateFile,
      card,
      message,
      blobId,
      fileType,
      filename,
      size,
      creator
    })
  }

  async removeFile(card: CardID, message: MessageID, blobId: BlobID, creator: SocialID): Promise<void> {
    await this.event({
      type: MessageRequestEventType.RemoveFile,
      card,
      message,
      blobId,
      creator
    })
  }

  async findMessages(params: FindMessagesParams): Promise<Message[]> {
    const searchParams = new URLSearchParams()
    if (Object.keys(params).length > 0) {
      searchParams.append('params', JSON.stringify(params))
    }
    const requestUrl = concatLink(this.endpoint, `/api/v1/find-messages/${this.workspace}?${searchParams.toString()}`)

    return await retry(
      async () => {
        const response = await fetch(requestUrl, this.requestInit())
        if (!response.ok) {
          throw new PlatformError(unknownError(response.statusText))
        }
        return await extractJson<MessagesGroup[]>(response)
      },
      { retries }
    )
  }

  async findMessagesGroups(params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    const searchParams = new URLSearchParams()
    if (Object.keys(params).length > 0) {
      searchParams.append('params', JSON.stringify(params))
    }
    const requestUrl = concatLink(
      this.endpoint,
      `/api/v1/find-messages-groups/${this.workspace}?${searchParams.toString()}`
    )
    return await retry(
      async () => {
        const response = await fetch(requestUrl, this.requestInit())
        if (!response.ok) {
          throw new PlatformError(unknownError(response.statusText))
        }
        return await extractJson<MessagesGroup[]>(response)
      },
      { retries }
    )
  }

  async findNotificationContexts(params: FindNotificationContextParams): Promise<NotificationContext[]> {
    const searchParams = new URLSearchParams()
    if (Object.keys(params).length > 0) {
      searchParams.append('params', JSON.stringify(params))
    }
    const requestUrl = concatLink(
      this.endpoint,
      `/api/v1/find-notification-contexts/${this.workspace}?${searchParams.toString()}`
    )
    return await retry(
      async () => {
        const response = await fetch(requestUrl, this.requestInit())
        if (!response.ok) {
          throw new PlatformError(unknownError(response.statusText))
        }
        return await extractJson<NotificationContext[]>(response)
      },
      { retries }
    )
  }

  async findNotifications(params: FindNotificationsParams): Promise<Notification[]> {
    const searchParams = new URLSearchParams()
    if (Object.keys(params).length > 0) {
      searchParams.append('params', JSON.stringify(params))
    }
    const requestUrl = concatLink(
      this.endpoint,
      `/api/v1/find-notifications/${this.workspace}?${searchParams.toString()}`
    )
    return await retry(
      async () => {
        const response = await fetch(requestUrl, this.requestInit())
        if (!response.ok) {
          throw new PlatformError(unknownError(response.statusText))
        }
        return await extractJson<Notification[]>(response)
      },
      { retries }
    )
  }
}
