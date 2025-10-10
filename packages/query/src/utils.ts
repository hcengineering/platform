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

import { parseMessagesDoc, parseTranslatedMessagesDoc } from '@hcengineering/communication-shared'
import {
  BlobID,
  type CardID,
  FindMessagesOptions,
  FindMessagesParams,
  type FindNotificationsParams,
  type Message,
  MessagesDoc,
  type Notification, TranslatedMessage, TranslatedMessagesDoc
} from '@hcengineering/communication-types'
import { type HulylakeWorkspaceClient } from '@hcengineering/hulylake-client'

export async function loadTranslatedMessages (client: HulylakeWorkspaceClient, cardId: CardID, blobId: BlobID, lang: string): Promise<TranslatedMessage[]> {
  try {
    const res = await client.getJson<TranslatedMessagesDoc>(`${cardId}/messages/${lang}/${blobId}`)
    if (res?.body == null) return []
    return parseTranslatedMessagesDoc(res.body)
  } catch (e) {
    console.error(e)
    return []
  }
}

export async function loadMessages (client: HulylakeWorkspaceClient, cardId: CardID, blobId: BlobID, params: FindMessagesParams, options?: FindMessagesOptions, cache?: Map<BlobID, Promise<MessagesDoc | undefined>>): Promise<Message[]> {
  const doc = await loadMessagesDoc(client, cardId, blobId, cache)

  if (doc === undefined) {
    return []
  }

  return parseMessagesDoc(doc, params, options)
}

async function requestMessagesDoc (client: HulylakeWorkspaceClient, cardId: CardID, blobId: BlobID): Promise<MessagesDoc | undefined> {
  const res = await client.getJson<MessagesDoc>(`${cardId}/messages/${blobId}`, {
    maxRetries: 3,
    isRetryable: () => true,
    delayStrategy: {
      getDelay: () => 500
    }
  })
  if (res?.body === undefined) {
    return undefined
  }
  return res.body
}

async function loadMessagesDoc (
  client: HulylakeWorkspaceClient,
  cardId: CardID,
  blobId: BlobID,
  cache?: Map<BlobID, Promise<MessagesDoc | undefined>>
): Promise<MessagesDoc | undefined> {
  if (cache != null && cache.has(blobId)) {
    return await cache.get(blobId)
  }
  const messagesPromise = requestMessagesDoc(client, cardId, blobId)
  if (cache != null) {
    cache.set(blobId, messagesPromise)
  }

  return await messagesPromise
}

export function matchNotification (notification: Notification, params: FindNotificationsParams): boolean {
  if (params.type !== undefined && params.type !== notification.type) return false
  if (params.read !== undefined && params.read !== notification.read) return false
  if (params.id !== undefined && params.id !== notification.id) return false
  if (params.contextId !== undefined && params.contextId !== notification.contextId) return false
  if (params.cardId !== undefined && params.cardId !== notification.cardId) return false

  const created = notification.created.getTime()

  if (params.created != null) {
    if (params.created instanceof Date) {
      if (created !== params.created.getTime()) return false
    } else {
      const { greater, less, greaterOrEqual, lessOrEqual } = params.created
      if (greater != null && created <= greater.getTime()) return false
      if (less != null && created >= less.getTime()) return false
      if (greaterOrEqual != null && created < greaterOrEqual.getTime()) return false
      if (lessOrEqual != null && created > lessOrEqual.getTime()) return false
    }
  }

  return true
}
