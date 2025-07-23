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
import { type KeyValueClient } from '@hcengineering/kvs-client'
import { SyncMutex, type SyncOptions } from '@hcengineering/mail-common'

import { RateLimiter } from '../rateLimiter'
import { IMessageManager } from './types'
import { SyncStateManager } from './syncState'
import config from '../config'

export class SyncManager {
  private readonly syncMutex = new SyncMutex()
  private readonly stateManager: SyncStateManager
  private isClosing = false

  constructor (
    private readonly ctx: MeasureContext,
    private readonly messageManager: IMessageManager,
    private readonly gmail: gmail_v1.Resource$Users,
    private readonly workspace: string,
    keyValueClient: KeyValueClient,
    private readonly rateLimiter: RateLimiter
  ) {
    this.stateManager = new SyncStateManager(keyValueClient, workspace, config.Version)
  }

  private async partSync (
    userId: PersonId,
    userEmail: string | undefined,
    historyId: string,
    options: SyncOptions
  ): Promise<void> {
    if (userEmail === undefined) {
      throw new Error('Cannot sync without user email')
    }
    let pageToken: string | undefined
    let histories: GaxiosResponse<gmail_v1.Schema$ListHistoryResponse>
    let maxHistoryId: string | undefined
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
        this.ctx.error('Part sync get history error', {
          workspaceUuid: this.workspace,
          userId,
          error: err.message,
          historyId
        })
        void this.syncNewMessages(userId, userEmail)
        return
      }
      const nextPageToken = histories.data.nextPageToken
      const array = histories.data.history ?? []
      this.ctx.info('Messages to migrate', { count: array.length })
      try {
        for (const history of array) {
          for (const message of history.messagesAdded ?? []) {
            if (this.isClosing) return
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
            if (maxHistoryId == null || BigInt(maxHistoryId) < BigInt(history.id)) {
              maxHistoryId = history.id
            }
          }
        }
        if (nextPageToken == null) {
          // Set the maximum historyId found during the sync, but only if it's greater than current
          if (maxHistoryId != null) {
            const currentHistory = await this.stateManager.getHistory(userId)
            const currentHistoryId = currentHistory?.historyId
            if (currentHistoryId == null || BigInt(maxHistoryId) > BigInt(currentHistoryId)) {
              await this.stateManager.setHistoryId(userId, maxHistoryId)
              this.ctx.info('Updated history ID', {
                userId,
                oldHistoryId: currentHistoryId,
                newHistoryId: maxHistoryId
              })
            } else {
              this.ctx.info('Skipping history ID update', {
                userId,
                currentHistoryId,
                maxHistoryId
              })
            }
          }
          return
        } else {
          pageToken = nextPageToken
        }
      } catch (err) {
        this.ctx.error('Part sync error', { workspaceUuid: this.workspace, userId, historyId, err })
        return
      }
    }
  }

  async fullSync (userId: PersonId, userEmail?: string, q?: string): Promise<void> {
    this.ctx.info('Start full sync', { workspaceUuid: this.workspace, userId, userEmail })
    if (userEmail === undefined) {
      throw new Error('Cannot sync without user email')
    }

    // Get saved page token to continue from
    let pageToken: string | undefined = (await this.stateManager.getPageToken(userId)) ?? undefined

    const query: gmail_v1.Params$Resource$Users$Messages$List = {
      userId: 'me',
      pageToken
    }
    if (q !== undefined) {
      query.q = q
    }
    let currentHistoryId: string | undefined
    let totalProcessedMessages = 0

    try {
      // Process one page at a time
      while (true) {
        await this.rateLimiter.take(5)
        const messages = await this.gmail.messages.list(query)

        const ids = messages.data.messages?.map((p) => p.id).filter((id) => id != null) ?? []
        this.ctx.info('Processing page', {
          workspace: this.workspace,
          userId,
          messagesInPage: ids.length,
          totalProcessed: totalProcessedMessages,
          currentHistoryId,
          pageToken: query.pageToken
        })

        for (const id of ids) {
          if (this.isClosing) return
          if (id == null) continue
          try {
            const message = await this.getMessage(id)
            const historyId = message.data.historyId
            await this.messageManager.saveMessage(message, userEmail)

            if (historyId != null && q === undefined) {
              if (currentHistoryId == null || BigInt(currentHistoryId) < BigInt(historyId)) {
                currentHistoryId = historyId
              }
            }
          } catch (err: any) {
            if (this.isClosing) return
            this.ctx.error('Full sync message error', { workspace: this.workspace, userId, messageId: id, err })
          }
        }

        totalProcessedMessages += ids.length

        if (messages.data.nextPageToken == null) {
          this.ctx.info('Completed sync', { workspace: this.workspace, userId, totalMessages: totalProcessedMessages })
          break
        }

        // Update page token for the next iteration
        pageToken = messages.data.nextPageToken
        query.pageToken = pageToken
        await this.stateManager.setPageToken(userId, pageToken)
      }

      if (currentHistoryId != null) {
        await this.stateManager.setHistoryId(userId, currentHistoryId)
      }
      this.ctx.info('Full sync finished', { workspaceUuid: this.workspace, userId, userEmail })
    } catch (err) {
      if (this.isClosing) return
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

  async syncNewMessages (userId: PersonId, userEmail?: string): Promise<void> {
    this.ctx.info('Start sync new messages', { workspaceUuid: this.workspace, userId, userEmail })
    if (userEmail === undefined) {
      throw new Error('Cannot sync without user email')
    }

    // Get stored history ID to compare against
    const storedHistory = await this.stateManager.getHistory(userId)
    const storedHistoryId = storedHistory?.historyId

    if (storedHistoryId == null) {
      this.ctx.info('No stored history ID found, performing full sync instead', { userId })
      await this.fullSync(userId, userEmail)
      return
    }

    this.ctx.info('Syncing new messages', {
      workspaceUuid: this.workspace,
      userId,
      storedHistoryId
    })

    let pageToken: string | undefined
    let totalProcessedMessages = 0
    let maxHistoryId: string | undefined
    let continueOuterLoop = true

    const query: gmail_v1.Params$Resource$Users$Messages$List = {
      userId: 'me'
    }

    try {
      // Process messages until we find one with historyId > storedHistoryId
      while (continueOuterLoop) {
        query.pageToken = pageToken
        await this.rateLimiter.take(5)
        const messages = await this.gmail.messages.list(query)

        const ids = messages.data.messages?.map((p) => p.id).filter((id) => id != null) ?? []
        this.ctx.info('Processing new messages page', {
          workspace: this.workspace,
          userId,
          messagesInPage: ids.length,
          totalProcessed: totalProcessedMessages,
          pageToken: query.pageToken
        })

        for (const id of ids) {
          if (this.isClosing) return
          if (id == null) continue

          try {
            const message = await this.getMessage(id)
            const messageHistoryId = message.data.historyId

            // If message has a history ID, check if it's newer than stored
            if (messageHistoryId != null) {
              if (BigInt(messageHistoryId) > BigInt(storedHistoryId)) {
                await this.messageManager.saveMessage(message, userEmail)
                totalProcessedMessages++

                // Track the maximum history ID found
                if (maxHistoryId == null || BigInt(messageHistoryId) > BigInt(maxHistoryId)) {
                  maxHistoryId = messageHistoryId
                }
              } else {
                // This message is older or equal to stored history, stop processing
                this.ctx.info('Reached message with history ID <= stored history ID, stopping sync', {
                  userId,
                  messageHistoryId,
                  storedHistoryId
                })
                continueOuterLoop = false
                break
              }
            } else {
              // Message without history ID, save it anyway
              await this.messageManager.saveMessage(message, userEmail)
              totalProcessedMessages++
            }
          } catch (err: any) {
            if (this.isClosing) return
            this.ctx.error('Sync new messages error', {
              workspace: this.workspace,
              userId,
              messageId: id,
              err
            })
          }
        }

        // If we should stop processing or no more pages, stop
        if (!continueOuterLoop || messages.data.nextPageToken == null) {
          this.ctx.info('Completed new messages sync', {
            workspace: this.workspace,
            userId,
            totalMessages: totalProcessedMessages
          })
          break
        }

        pageToken = messages.data.nextPageToken
      }

      // Update stored history ID with the maximum found, only if we found newer messages
      if (maxHistoryId != null && BigInt(maxHistoryId) > BigInt(storedHistoryId)) {
        await this.stateManager.setHistoryId(userId, maxHistoryId)
        this.ctx.info('Updated history ID after new messages sync', {
          userId,
          oldHistoryId: storedHistoryId,
          newHistoryId: maxHistoryId,
          messagesProcessed: totalProcessedMessages
        })
      } else {
        this.ctx.info('No history ID update needed after new messages sync', {
          userId,
          storedHistoryId,
          maxHistoryId,
          messagesProcessed: totalProcessedMessages
        })
      }

      this.ctx.info('New messages sync finished', {
        workspaceUuid: this.workspace,
        userId,
        userEmail,
        totalMessages: totalProcessedMessages
      })
    } catch (err) {
      if (this.isClosing) return
      this.ctx.error('New messages sync error', { workspace: this.workspace, userId, err })
    }
  }

  async sync (userId: PersonId, options: SyncOptions, userEmail?: string): Promise<void> {
    const mutexKey = `${this.workspace}:${userId}`
    const releaseLock = await this.syncMutex.lock(mutexKey)

    try {
      this.ctx.info('Sync history', { workspaceUuid: this.workspace, userId, userEmail })

      const history = await this.stateManager.getHistory(userId)
      if (history?.historyId != null && history?.historyId !== '') {
        this.ctx.info('Start part sync', { workspaceUuid: this.workspace, userId, historyId: history.historyId })
        await this.partSync(userId, userEmail, history.historyId, options)
      } else {
        this.ctx.info('Start full sync', { workspaceUuid: this.workspace, userId })
        await this.fullSync(userId, userEmail)
      }
    } catch (err) {
      if (this.isClosing) return
      this.ctx.error('Sync error', { workspace: this.workspace, userId, userEmail, err })
    } finally {
      releaseLock()
    }
  }

  close (): void {
    this.isClosing = true
  }
}
