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

import { MeasureContext, systemAccountUuid, WorkspaceUuid } from '@hcengineering/core'
import { getClient, type HulylakeClient, type JsonPatch } from '@hcengineering/hulylake-client'
import { generateToken } from '@hcengineering/server-token'
import {
  BlobID,
  CardID,
  Markdown,
  Message,
  MessageID,
  TranslatesMessageDoc,
  TranslatedMessagesDoc
} from '@hcengineering/communication-types'

import config from './config'

export class Storage {
  private readonly createdBlobs = new Map<WorkspaceUuid, Map<string, Set<BlobID>>>()

  private readonly retryOptions = {
    maxRetries: 3,
    isRetryable: () => true,
    delayStrategy: {
      getDelay: () => 1000
    }
  } as const

  constructor (private readonly ctx: MeasureContext) {}

  private getClient (ws: WorkspaceUuid): HulylakeClient {
    const token = generateToken(systemAccountUuid, ws, undefined, config.Secret)
    return getClient(config.HulylakeUrl, ws, token)
  }

  private async createMessageGroup (ws: WorkspaceUuid, cardId: CardID, blobId: BlobID, lang: string): Promise<void> {
    const created = this.createdBlobs.get(ws)?.get(lang)?.has(blobId) ?? false

    if (created) return

    const client = this.getClient(ws)

    const current = await client.getJson<TranslatedMessagesDoc>(`${cardId}/messages/${lang}/${blobId}`)

    if (current?.body == null) {
      const initialJson: TranslatedMessagesDoc = {
        cardId,
        language: lang,
        messages: {}
      }

      await client.putJson(`${cardId}/messages/${lang}/${blobId}`, initialJson, undefined, this.retryOptions)
    }

    const map = this.createdBlobs.get(ws) ?? new Map()
    const set = map.get(lang) ?? new Set()
    set.add(blobId)
    map.set(lang, set)
    this.createdBlobs.set(ws, map)
  }

  async insertMessage (
    ws: WorkspaceUuid,
    cardId: CardID,
    blobId: BlobID,
    lang: string,
    message: Message,
    translated: Markdown
  ): Promise<void> {
    await this.createMessageGroup(ws, cardId, blobId, lang)

    const serializedMessage = this.serializeMessage(message, translated)
    const patches: JsonPatch[] = [
      {
        hop: 'add',
        path: `/messages/${message.id}`,
        value: serializedMessage,
        safe: true
      }
    ]
    await this.patchJson(ws, cardId, blobId, lang, patches)
  }

  async updateMessage (
    ws: WorkspaceUuid,
    cardId: CardID,
    blobId: BlobID,
    messageId: MessageID,
    lang: string,
    translated: Markdown
  ): Promise<void> {
    const patches: JsonPatch[] = []

    patches.push({
      op: 'replace',
      path: `/messages/${messageId}/content`,
      value: translated
    })

    await this.patchJson(ws, cardId, blobId, lang, patches)
  }

  async removeMessage (
    ws: WorkspaceUuid,
    cardId: CardID,
    blobId: BlobID,
    messageId: MessageID,
    lang: string
  ): Promise<void> {
    const patches: JsonPatch[] = [
      {
        op: 'remove',
        path: `/messages/${messageId}`
      } as const
    ]

    await this.patchJson(ws, cardId, blobId, lang, patches)
  }

  private async patchJson (
    ws: WorkspaceUuid,
    cardId: CardID,
    blobId: BlobID,
    lang: string,
    patches: JsonPatch[]
  ): Promise<void> {
    const client = this.getClient(ws)
    await client.patchJson(`${cardId}/messages/${lang}/${blobId}`, patches, undefined, this.retryOptions)
  }

  private serializeMessage (message: Message, translated: Markdown): TranslatesMessageDoc {
    return {
      id: message.id,
      created: message.created.toISOString(),
      creator: message.creator,
      content: translated
    }
  }
}
