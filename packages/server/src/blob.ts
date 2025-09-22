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

import {
  generateUuid,
  MeasureContext,
  PersonUuid,
  systemAccountUuid,
  WorkspaceUuid
} from '@hcengineering/core'
import { type HulylakeClient, getClient, type JsonPatch } from '@hcengineering/hulylake-client'
import { generateToken } from '@hcengineering/server-token'
import {
  Attachment,
  AttachmentID,
  AttachmentUpdateData,
  BlobID,
  CardID,
  CardType,
  Markdown,
  Message,
  MessageDoc,
  MessageExtra,
  MessageID,
  MessagesDoc,
  MessagesGroup,
  MessagesGroupDoc,
  MessagesGroupsDoc,
  Thread
} from '@hcengineering/communication-types'
import { Metadata } from './types'

export class Blob {
  private readonly client: HulylakeClient
  // Groups sored by fromDate
  private readonly messageGroupsByCardId = new Map<CardID, MessagesGroup[]>()
  private readonly messageGroupsPromises = new Map<CardID, Promise<MessagesGroup[]>>()

  private readonly messageGroupCreationPromises = new Map<CardID, Promise<MessagesGroup>>()

  private readonly retryOptions = {
    maxRetries: 3,
    isRetryable: () => true,
    delayStrategy: {
      getDelay: () => 1000
    }
  } as const

  constructor (private readonly ctx: MeasureContext, private readonly workspace: WorkspaceUuid, private readonly metadata: Metadata) {
    this.client = getClient(metadata.hulylakeUrl, workspace, generateToken(systemAccountUuid, workspace, undefined, metadata.secret))
  }

  private async getAllMessageGroups (cardId: CardID): Promise<MessagesGroup[]> {
    const createPromise = this.messageGroupCreationPromises.get(cardId)

    if (createPromise != null) {
      await createPromise
    }

    if (this.messageGroupsByCardId.has(cardId)) {
      return this.messageGroupsByCardId.get(cardId) ?? []
    }

    const existingPromise = this.messageGroupsPromises.get(cardId)
    if (existingPromise != null) return await existingPromise

    const promise = (async () => {
      try {
        const res = await this.client.getJson<MessagesGroupsDoc>(`${cardId}/messages/groups`, this.retryOptions)
        if (res?.body == null) {
          await this.createMessagesGroupBlob(cardId)
          this.messageGroupsByCardId.set(cardId, [])
          return []
        }

        const groups = Object.values(res.body).map(it => this.deserializeMessageGroup(it)).sort((a, b) => a.fromDate.getTime() - b.fromDate.getTime())
        this.messageGroupsByCardId.set(cardId, groups)
        return groups
      } finally {
        this.messageGroupsPromises.delete(cardId)
      }
    })()

    this.messageGroupsPromises.set(cardId, promise)
    return await promise
  }

  public async getMessageGroupByDate (cardId: CardID, date: Date, create = true): Promise<MessagesGroup | undefined> {
    const all = await this.getAllMessageGroups(cardId)
    const ts = date.getTime()

    const match = all.find(g => g.fromDate.getTime() <= ts && g.toDate.getTime() >= ts)
    if (match != null) return match

    for (let i = all.length - 1; i >= 0; i--) {
      const group = all[i]
      if (group.fromDate.getTime() <= ts && group.count < this.metadata.messagesPerBlob) {
        return group
      }
    }

    for (let i = 0; i < all.length; i++) {
      const group = all[i]
      if (group.fromDate.getTime() >= ts && group.count < this.metadata.messagesPerBlob) {
        return group
      }
    }
    if (create) return await this.createMessageGroup(cardId, date)

    return undefined
  }

  private async createMessagesGroupBlob (cardId: CardID): Promise<void> {
    await this.client.putJson(`${cardId}/messages/groups`, {}, undefined, this.retryOptions)
  }

  private async incrementMessagesCount (cardId: CardID, blobId: BlobID, toDate?: Date, fromDate?: Date): Promise<void> {
    const groups = await this.getAllMessageGroups(cardId)
    const group = groups.find((g) => g.blobId === blobId)

    if (group == null) return

    this.messageGroupsByCardId.set(cardId, groups.map((g) => g.blobId === blobId ? ({ ...g, count: g.count + 1, toDate: toDate ?? group.toDate, fromDate: fromDate ?? group.fromDate }) : g))

    const patches: JsonPatch[] = [
      {
        hop: 'inc',
        path: `/${blobId}/count`,
        value: 1
      },
      ...toDate != null
        ? [{
            op: 'replace',
            path: `/${blobId}/toDate`,
            value: toDate
          } as const]
        : [],
      ...fromDate != null
        ? [{
            hop: 'add',
            path: `/${blobId}/fromDate`,
            value: fromDate
          } as const]
        : []
    ]
    await this.client.patchJson(`${cardId}/messages/groups`, patches, undefined, this.retryOptions)
  }

  private async decrementMessagesCount (cardId: CardID, blobId: BlobID): Promise<void> {
    const groups = await this.getAllMessageGroups(cardId)
    const group = groups.find((g) => g.blobId === blobId)

    if (group == null) return

    const count = group.count - 1
    group.count = count
    this.messageGroupsByCardId.set(cardId, groups.map((g) => g.blobId === blobId ? ({ ...g, count }) : g))

    const patches: JsonPatch[] = [
      {
        hop: 'inc',
        path: `/${blobId}/count`,
        value: -1
      }
    ]
    await this.client.patchJson(`${cardId}/messages/groups`, patches, undefined, this.retryOptions)
  }

  private async createMessageGroup (cardId: CardID, date: Date): Promise<MessagesGroup> {
    const createPromise = this.messageGroupCreationPromises.get(cardId)

    if (createPromise != null) {
      await createPromise
      const group = await this.getMessageGroupByDate(cardId, date, false)
      if (group != null) return group
    }

    const promise = (async () => {
      try {
        const groupDoc: MessagesGroupDoc = {
          cardId,
          blobId: generateUuid() as BlobID,
          fromDate: date.toISOString(),
          toDate: date.toISOString(),
          count: 0
        }
        const patches: JsonPatch[] = [
          {
            hop: 'add',
            path: `/${groupDoc.blobId}`,
            value: groupDoc,
            safe: true
          }
        ]

        await this.client.patchJson(`${cardId}/messages/groups`, patches, undefined, this.retryOptions)
        const group = this.deserializeMessageGroup(groupDoc)
        if (this.messageGroupsByCardId.has(cardId)) {
          this.messageGroupsByCardId.set(cardId, [...this.messageGroupsByCardId.get(cardId) ?? [], group])
        } else {
          this.messageGroupsByCardId.set(cardId, [group])
        }
        await this.createMessagesBlob(cardId, groupDoc.blobId, date, date)

        return group
      } finally {
        this.messageGroupCreationPromises.delete(cardId)
      }
    })()

    this.messageGroupCreationPromises.set(cardId, promise)
    return await promise
  }

  private async createMessagesBlob (cardId: CardID, blobId: BlobID, from: Date, to: Date): Promise<void> {
    const initialJson: MessagesDoc = {
      cardId,
      fromDate: from.toISOString(),
      toDate: to.toISOString(),
      language: 'original',
      messages: {}
    }

    await this.client.putJson(`${cardId}/messages/${blobId}`, initialJson, undefined, this.retryOptions)
  }

  async insertMessage (cardId: CardID, group: MessagesGroup, message: Message): Promise<void> {
    const updateToDate = message.created.getTime() > group.toDate.getTime()
    const updateFromDate = message.created.getTime() < group.fromDate.getTime()

    const serializedMessage = this.serializeMessage(message)
    const patches: JsonPatch[] = [
      {
        hop: 'add',
        path: `/messages/${message.id}`,
        value: serializedMessage,
        safe: true
      },
      ...(updateToDate
        ? [
            {
              op: 'replace',
              path: '/toDate',
              value: message.created
            } as const
          ]
        : []),
      ...(updateFromDate
        ? [
            {
              hop: 'add',
              path: '/fromDate',
              value: message.created
            } as const
          ]
        : [])
    ]
    await this.patchJson(cardId, group.blobId, patches)
    void this.incrementMessagesCount(cardId, group.blobId, updateToDate ? message.created : undefined, updateFromDate ? message.created : undefined)
  }

  async updateMessage (cardId: CardID, blobId: BlobID, messageId: MessageID, update: {
    content?: Markdown
    extra?: MessageExtra
  }, date: Date): Promise<void> {
    const patches: JsonPatch[] = []

    if (update.content != null) {
      patches.push({
        op: 'replace',
        path: `/messages/${messageId}/content`,
        value: update.content
      })
    }

    if (update.extra != null) {
      patches.push({
        op: 'replace',
        path: `/messages/${messageId}/extra`,
        value: update.extra
      })
    }

    if (patches.length === 0) return

    patches.push({
      op: 'replace',
      path: `/messages/${messageId}/modified`,
      value: date
    })

    await this.patchJson(cardId, blobId, patches)
  }

  async removeMessage (cardId: CardID, blobId: BlobID, messageId: MessageID): Promise<void> {
    const patches: JsonPatch[] = [
      {
        op: 'remove',
        path: `/messages/${messageId}`
      } as const
    ]

    await this.patchJson(cardId, blobId, patches)
    void this.decrementMessagesCount(cardId, blobId)
  }

  async addReaction (cardId: CardID, blobId: BlobID, messageId: MessageID, emoji: string, person: PersonUuid, date: Date): Promise<void> {
    const patches: JsonPatch[] = [
      {
        hop: 'add',
        path: `/messages/${messageId}/reactions/${emoji}`,
        value: {},
        safe: true
      },
      {
        hop: 'add',
        path: `/messages/${messageId}/reactions/${emoji}/${person}`,
        value: {
          count: 1,
          date
        },
        safe: true
      }
    ]
    await this.patchJson(cardId, blobId, patches)
  }

  async removeReaction (cardId: CardID, blobId: BlobID, messageId: MessageID, emoji: string, person: PersonUuid): Promise<void> {
    const patches: JsonPatch[] = [
      {
        op: 'remove',
        path: `/messages/${messageId}/reactions/${emoji}/${person}`
      }
    ]
    await this.patchJson(cardId, blobId, patches)
  }

  async addAttachments (cardId: CardID, blobId: BlobID, messageId: MessageID, attachments: Attachment[]): Promise<void> {
    const patches: JsonPatch[] = []

    for (const attachment of attachments) {
      patches.push({
        op: 'add',
        path: `/messages/${messageId}/attachments/${attachment.id}`,
        value: attachment
      })
    }
    await this.patchJson(cardId, blobId, patches)
  }

  async removeAttachments (cardId: CardID, blobId: BlobID, messageId: MessageID, attachmentIds: AttachmentID[]): Promise<void> {
    const patches: JsonPatch[] = []

    for (const attachmentId of attachmentIds) {
      patches.push({
        op: 'remove',
        path: `/messages/${messageId}/attachments/${attachmentId}`
      })
    }
    await this.patchJson(cardId, blobId, patches)
  }

  async setAttachments (cardId: CardID, blobId: BlobID, messageId: MessageID, attachments: Attachment[]): Promise<void> {
    const patches: JsonPatch[] = [{
      op: 'replace',
      path: `/messages/${messageId}/attachments`,
      value: {}
    }]

    for (const attachment of attachments) {
      patches.push({
        op: 'add',
        path: `/messages/${messageId}/attachments/${attachment.id}`,
        value: attachment
      })
    }
    await this.patchJson(cardId, blobId, patches)
  }

  async updateAttachments (cardId: CardID, blobId: BlobID, messageId: MessageID, updates: AttachmentUpdateData[], date: Date): Promise<void> {
    const patches: JsonPatch[] = []
    for (const update of updates) {
      const keys = Object.keys(update.params)
      if (keys.length === 0) continue
      for (const key of keys) {
        patches.push({
          op: 'add',
          path: `/messages/${messageId}/attachments/${update.id}/params/${key}`,
          value: update.params[key]
        })
      }
      patches.push({
        op: 'add',
        path: `/messages/${messageId}/attachments/${update.id}/modified`,
        value: date.toISOString()
      })
    }

    await this.patchJson(cardId, blobId, patches)
  }

  async attachThread (cardId: CardID, blobId: BlobID, messageId: MessageID, thread: Thread): Promise<void> {
    const patches: JsonPatch[] = [
      {
        op: 'add',
        path: `/messages/${messageId}/threads/${thread.threadId}`,
        value: thread
      }
    ]
    await this.patchJson(cardId, blobId, patches)
  }

  async updateThread (cardId: CardID, blobId: BlobID, messageId: MessageID, threadId: CardID, update: { threadType: CardType }): Promise<void> {
    const patches: JsonPatch[] = [
      {
        op: 'add',
        path: `/messages/${messageId}/threads/${threadId}/threadType`,
        value: update.threadType
      }
    ]
    await this.patchJson(cardId, blobId, patches)
  }

  async addThreadReply (cardId: CardID, blobId: BlobID, messageId: MessageID, threadId: CardID, person: PersonUuid, date: Date): Promise<void> {
    const patches: JsonPatch[] =
      [
        {
          hop: 'inc',
          path: `/messages/${messageId}/threads/${threadId}/repliesCount`,
          value: 1
        },
        {
          op: 'add',
          path: `/messages/${messageId}/threads/${threadId}/lastReply`,
          value: date
        },
        {
          hop: 'inc',
          path: `/messages/${messageId}/threads/${threadId}/repliedPersons/${person}`,
          value: 1
        }
      ]

    await this.patchJson(cardId, blobId, patches)
  }

  async removeThreadReply (cardId: CardID, blobId: BlobID, messageId: MessageID, threadId: CardID, person: PersonUuid): Promise<void> {
    const patches: JsonPatch[] =
      [
        {
          hop: 'inc',
          path: `/messages/${messageId}/threads/${threadId}/repliesCount`,
          value: -1
        },
        {
          hop: 'inc',
          path: `/messages/${messageId}/threads/${threadId}/repliedPersons/${person}`,
          value: -1
        }
      ]

    await this.patchJson(cardId, blobId, patches)
  }

  private async patchJson (cardId: CardID, blobId: BlobID, patches: JsonPatch[]): Promise<void> {
    await this.client.patchJson(`${cardId}/messages/${blobId}`, patches, undefined, this.retryOptions)
  }

  private deserializeMessageGroup (group: MessagesGroupDoc): MessagesGroup {
    return {
      cardId: group.cardId,
      blobId: group.blobId,
      fromDate: new Date(group.fromDate),
      toDate: new Date(group.toDate),
      count: group.count
    }
  }

  private serializeMessage (message: Message): MessageDoc {
    return {
      ...message,
      extra: message.extra ?? {},
      created: message.created.toISOString(),
      modified: message.modified?.toISOString() ?? null,
      reactions: {},
      attachments: {},
      threads: {}
    }
  }
}
