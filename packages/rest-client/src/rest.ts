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
import {
  type EventResult,
  type Event,
  type CreateMessageResult,
  type CreateMessageOptions,
  UpdatePatchOptions,
  MessageEventType
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
  type Markdown,
  type SocialID,
  type CardType,
  type MessageType,
  type BlobID,
  type MessageExtra,
  type BlobData
} from '@hcengineering/communication-types'
import { retry } from '@hcengineering/communication-shared'

import { extractJson } from './utils'
import type { RestClient } from './types'

const retries = 3

export function createRestClient (endpoint: string, workspaceId: string, token: string): RestClient {
  return new RestClientImpl(endpoint, workspaceId, token)
}

class RestClientImpl implements RestClient {
  endpoint: string

  constructor (
    endpoint: string,
    readonly workspace: string,
    readonly token: string
  ) {
    this.endpoint = endpoint.replace('ws', 'http')
  }

  private jsonHeaders (): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + this.token,
      'accept-encoding': 'snappy, gzip'
    }
  }

  private requestInit (): RequestInit {
    return {
      method: 'GET',
      keepalive: true,
      headers: this.jsonHeaders()
    }
  }

  async event (event: Event): Promise<EventResult> {
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
      throw new Error(response.statusText)
    }
    return (await response.json()) as EventResult
  }

  async createMessage (
    cardId: CardID,
    cardType: CardType,
    content: Markdown,
    type: MessageType,
    extra: MessageExtra | undefined,
    socialId: SocialID,
    date?: Date,
    messageId?: MessageID,
    options?: CreateMessageOptions
  ): Promise<CreateMessageResult> {
    const result = await this.event({
      type: MessageEventType.CreateMessage,
      messageType: type,
      cardId,
      cardType,
      content,
      extra,
      socialId,
      date,
      messageId,
      options
    })
    return result as CreateMessageResult
  }

  async updateMessage (
    cardId: CardID,
    messageId: MessageID,
    content: Markdown | undefined,
    extra: MessageExtra | undefined,
    socialId: SocialID,
    date?: Date,
    options?: UpdatePatchOptions
  ): Promise<void> {
    await this.event({
      type: MessageEventType.UpdatePatch,
      cardId,
      messageId,
      content,
      extra,
      socialId,
      date,
      options
    })
  }

  async removeMessage (cardId: CardID, messageId: MessageID, socialId: SocialID, date?: Date): Promise<void> {
    await this.event({
      type: MessageEventType.RemovePatch,
      cardId,
      messageId,
      socialId,
      date
    })
  }

  async attachBlobs (
    cardId: CardID,
    messageId: MessageID,
    blobs: BlobData[],
    socialId: SocialID,
    date?: Date
  ): Promise<void> {
    await this.event({
      type: MessageEventType.BlobPatch,
      cardId,
      messageId,
      operations: [
        {
          opcode: 'attach',
          blobs
        }
      ],
      socialId,
      date
    })
  }

  async detachBlobs (
    cardId: CardID,
    messageId: MessageID,
    blobIds: BlobID[],
    socialId: SocialID,
    date?: Date
  ): Promise<void> {
    await this.event({
      type: MessageEventType.BlobPatch,
      cardId,
      messageId,
      operations: [
        {
          opcode: 'detach',
          blobIds
        }
      ],
      socialId,
      date
    })
  }

  async setBlobs (
    cardId: CardID,
    messageId: MessageID,
    blobs: BlobData[],
    socialId: SocialID,
    date?: Date
  ): Promise<void> {
    await this.event({
      type: MessageEventType.BlobPatch,
      cardId,
      messageId,
      operations: [
        {
          opcode: 'set',
          blobs
        }
      ],
      socialId,
      date
    })
  }

  async findMessages (params: FindMessagesParams): Promise<Message[]> {
    const searchParams = new URLSearchParams()
    if (Object.keys(params).length > 0) {
      searchParams.append('params', JSON.stringify(params))
    }
    const requestUrl = concatLink(this.endpoint, `/api/v1/find-messages/${this.workspace}?${searchParams.toString()}`)

    return await retry(
      async () => {
        const response = await fetch(requestUrl, this.requestInit())
        if (!response.ok) {
          throw new Error(response.statusText)
        }
        return await extractJson<Message[]>(response)
      },
      { retries }
    )
  }

  async findMessagesGroups (params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
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
          throw new Error(response.statusText)
        }
        return await extractJson<MessagesGroup[]>(response)
      },
      { retries }
    )
  }

  async findNotificationContexts (params: FindNotificationContextParams): Promise<NotificationContext[]> {
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
          throw new Error(response.statusText)
        }
        return await extractJson<NotificationContext[]>(response)
      },
      { retries }
    )
  }

  async findNotifications (params: FindNotificationsParams): Promise<Notification[]> {
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
          throw new Error(response.statusText)
        }
        return await extractJson<Notification[]>(response)
      },
      { retries }
    )
  }
}
