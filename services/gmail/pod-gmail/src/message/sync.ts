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
import { type MeasureContext, PersonId, WorkspaceUuid } from '@hcengineering/core'
import { type GaxiosResponse } from 'gaxios'
import { gmail_v1 } from 'googleapis'
import { RateLimiter } from '../rateLimiter'
import { type Token } from '../types'
import { TokenStorage } from '../tokens'
import { MessageManager } from './message'

interface History {
  historyId: string
  userId: string
  workspace: string
}

export class SyncManager {
  private readonly rateLimiter = new RateLimiter(1000, 200)
  private readonly tokenStorage: TokenStorage

  constructor (
    private readonly ctx: MeasureContext,
    private readonly messageManager: MessageManager,
    private readonly gmail: gmail_v1.Resource$Users,
    private readonly workspace: string,
    workspaceId: WorkspaceUuid,
    token: string
  ) {
    this.tokenStorage = new TokenStorage(workspaceId, token)
  }

  private async getHistory (userId: PersonId): Promise<History | null> {
    const token = await this.tokenStorage.getToken(userId)
    if (token === null) return null
    return {
      historyId: (token as any).historyId ?? '',
      userId,
      workspace: this.workspace
    }
  }

  private async clearHistory (userId: PersonId): Promise<void> {
    const token = await this.tokenStorage.getToken(userId)
    if (token === null) return
    const updatedToken = { ...token, historyId: undefined }
    await this.tokenStorage.saveToken(updatedToken as Token)
  }

  private async setHistoryId (userId: PersonId, historyId: string): Promise<void> {
    const token = await this.tokenStorage.getToken(userId)
    if (token === null) return
    const updatedToken = { ...token, historyId }
    await this.tokenStorage.saveToken(updatedToken as Token)
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
      } catch (err) {
        console.log('Part sync get history error', this.workspace, userId, err)
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
              console.log('Part sync message error', this.workspace, userId, message.message.id, err)
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
        console.log('Part sync error', this.workspace, userId, err)
        return
      }
    }
  }

  async fullSync (userId: PersonId, userEmail?: string, q?: string): Promise<void> {
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
    console.log('start full sync', this.workspace, userId, q)
    try {
      const messagesIds: string[] = []
      while (true) {
        await this.rateLimiter.take(5)
        const messages = await this.gmail.messages.list(query)
        if (query.pageToken == null) {
          console.log('Total messages', this.workspace, userId, messages.data.resultSizeEstimate)
        }
        const ids = messages.data.messages?.map((p) => p.id) ?? []
        for (let index = 0; index < ids.length; index++) {
          const id = ids[index]
          if (id == null) continue
          messagesIds.push(id)
        }
        if (messages.data.nextPageToken == null) {
          console.log('Break, total new messages: ', messagesIds.length)
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
        } catch (err: any) {
          console.log('Full sync message error', this.workspace, userId, err)
        }
      }
    } catch (err) {
      console.log('Full sync error', this.workspace, userId, err)
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
    const history = await this.getHistory(userId)
    try {
      if (history != null) {
        await this.partSync(userId, userEmail, history.historyId)
      } else {
        await this.fullSync(userId)
      }
    } catch (err) {
      console.log('Sync error', this.workspace, userId, err)
    }
  }
}
