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
import { type GaxiosResponse } from 'gaxios'
import { gmail_v1 } from 'googleapis'

import { type MeasureContext, PersonId } from '@hcengineering/core'
import { type KeyValueClient } from '@hcengineering/key-value-client'

import { RateLimiter } from '../rateLimiter'
import { MessageManager } from './message'

interface History {
  historyId: string
  userId: string
  workspace: string
}

export class SyncManager {
  private readonly rateLimiter = new RateLimiter(1000, 200)
  private syncPromise: Promise<void> | undefined = undefined
  private readonly kvNamespace = 'gmail'

  constructor (
    private readonly ctx: MeasureContext,
    private readonly messageManager: MessageManager,
    private readonly gmail: gmail_v1.Resource$Users,
    private readonly workspace: string,
    private readonly keyValueClient: KeyValueClient
  ) {}

  private async getHistory (userId: PersonId): Promise<History | null> {
    const historyKey = this.getHistoryKey(userId)
    return await this.keyValueClient.getValue<History>(this.kvNamespace, historyKey)
  }

  private async clearHistory (userId: PersonId): Promise<void> {
    const historyKey = this.getHistoryKey(userId)
    await this.keyValueClient.deleteKey(this.kvNamespace, historyKey)
  }

  private async setHistoryId (userId: PersonId, historyId: string): Promise<void> {
    const historyKey = this.getHistoryKey(userId)
    const history: History = {
      historyId,
      userId,
      workspace: this.workspace
    }
    await this.keyValueClient.setValue(this.kvNamespace, historyKey, history)
  }

  private async partSync (userId: PersonId, userEmail: string | undefined, historyId: string): Promise<void> {
    if (userEmail === undefined) {
      throw new Error('Cannot sync without user email')
    }
    let pageToken: string | undefined
    let histories: GaxiosResponse<gmail_v1.Schema$ListHistoryResponse>
    while (true) {
      try {
        await this.rateLimiter.take(2)
        histories = await this.gmail.history.list({
          userId: 'me',
          historyTypes: ['messageAdded'],
          startHistoryId: historyId,
          pageToken
        })
      } catch (err: any) {
        this.ctx.error('Part sync get history error', { workspaceUuid: this.workspace, userId, error: err.message })
        await this.clearHistory(userId)
        await this.sync(userId)
        return
      }
      const nextPageToken = histories.data.nextPageToken
      const array = histories.data.history ?? []
      try {
        for (const history of array) {
          for (const message of history.messagesAdded ?? []) {
            if (message.message?.id == null || (message.message.labelIds?.includes('DRAFT') ?? false)) {
              continue
            }
            try {
              const res = await this.getMessage(message.message.id)
              await this.messageManager.saveMessage(res, userEmail)
            } catch (err) {
              this.ctx.error('Part sync message error', {
                workspaceUuid: this.workspace,
                userId,
                messageId: message.message.id,
                err
              })
            }
          }
          if (history.id != null) {
            await this.setHistoryId(userId, history.id)
          }
        }
        if (nextPageToken == null) {
          return
        } else {
          pageToken = nextPageToken
        }
      } catch (err) {
        this.ctx.error('Part sync error', { workspaceUuid: this.workspace, userId, err })
        return
      }
    }
  }

  async fullSync (userId: PersonId, userEmail?: string, q?: string): Promise<void> {
    this.ctx.info('Start full sync', { workspaceUuid: this.workspace, userId, userEmail })
    if (userEmail === undefined) {
      throw new Error('Cannot sync without user email')
    }
    const pageToken: string | undefined = undefined
    const query: gmail_v1.Params$Resource$Users$Messages$List = {
      userId: 'me',
      pageToken
    }
    if (q !== undefined) {
      query.q = q
    }
    let currentHistoryId: string | undefined
    try {
      const messagesIds: string[] = []
      while (true) {
        await this.rateLimiter.take(5)
        const messages = await this.gmail.messages.list(query)
        if (query.pageToken == null) {
          this.ctx.info('Total messages', {
            workspace: this.workspace,
            userId,
            resultSizeEstimate: messages.data.resultSizeEstimate
          })
        }
        const ids = messages.data.messages?.map((p) => p.id) ?? []
        for (let index = 0; index < ids.length; index++) {
          const id = ids[index]
          if (id == null) continue
          messagesIds.push(id)
        }
        if (messages.data.nextPageToken == null) {
          this.ctx.info('Break', { totalNewMessages: messagesIds.length })
          break
        }
        query.pageToken = messages.data.nextPageToken
      }
      for (let index = messagesIds.length - 1; index >= 0; index--) {
        const id = messagesIds[index]
        try {
          const message = await this.getMessage(id)
          const historyId = message.data.historyId
          await this.messageManager.saveMessage(message, userEmail)
          if (historyId != null && q === undefined) {
            if (currentHistoryId == null || Number(currentHistoryId) < Number(historyId)) {
              await this.setHistoryId(userId, historyId)
              currentHistoryId = historyId
            }
          }
          if (index % 500 === 0) {
            this.ctx.info('Remaining messages to sync', { workspace: this.workspace, userId, count: index })
          }
        } catch (err: any) {
          this.ctx.error('Full sync message error', { workspace: this.workspace, userId, err })
        }
      }
    } catch (err) {
      this.ctx.error('Full sync error', { workspace: this.workspace, userId, err })
    }
  }

  private async getMessage (id: string): Promise<GaxiosResponse<gmail_v1.Schema$Message>> {
    await this.rateLimiter.take(5)
    return await this.gmail.messages.get({
      id,
      userId: 'me',
      format: 'FULL'
    })
  }

  async sync (userId: PersonId, userEmail?: string): Promise<void> {
    this.ctx.info('Sync history', { workspaceUuid: this.workspace, userId, userEmail })
    if (this.syncPromise !== undefined) {
      await this.syncPromise
    }
    const history = await this.getHistory(userId)
    try {
      if (history?.historyId != null && history?.historyId !== '') {
        this.syncPromise = this.partSync(userId, userEmail, history.historyId)
        await this.syncPromise
      } else {
        this.syncPromise = this.fullSync(userId, userEmail)
        await this.syncPromise
      }
    } catch (err) {
      this.ctx.error('Sync error', { workspace: this.workspace, userId, err })
    }
  }

  private getHistoryKey (userId: PersonId): string {
    return `history:${this.workspace}:${userId}`
  }
}
