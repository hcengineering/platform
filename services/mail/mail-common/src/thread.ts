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

import { MeasureContext, Ref, Space } from '@hcengineering/core'
import { type KeyValueClient } from '@hcengineering/kvs-client'
import { Card } from '@hcengineering/card'

export interface ThreadInfo {
  threadId: Ref<Card>
}

/**
 * Service that manages mappings between emails and threads in spaces
 */
export class ThreadLookupService {
  // Replace single instance with a map of instances keyed by token
  private static readonly instances = new Map<string, ThreadLookupService>()

  private constructor (
    private readonly keyValueClient: KeyValueClient,
    private readonly ctx: MeasureContext
  ) {}

  static getInstance (ctx: MeasureContext, keyValueClient: KeyValueClient, token: string): ThreadLookupService {
    // Use token as key to retrieve or create instance
    const instance = ThreadLookupService.instances.get(token)
    if (instance != null) {
      return instance
    }
    const newInstance = new ThreadLookupService(keyValueClient, ctx)
    ThreadLookupService.instances.set(token, newInstance)
    return newInstance
  }

  // Reset all instances for testing purposes
  static resetAllInstances (): void {
    ThreadLookupService.instances.clear()
  }

  static resetInstance (token: string): void {
    ThreadLookupService.instances.delete(token)
  }

  async getThreadId (mailId: string, spaceId: Ref<Space>, email: string): Promise<Ref<Card> | undefined> {
    try {
      if (mailId == null || spaceId == null) {
        this.ctx.warn('Invalid parameters for thread lookup', { mailId, spaceId })
        return undefined
      }
      const key = this.getLookupKey(mailId, spaceId, email)
      const lookup = await this.keyValueClient.getValue<ThreadInfo>(key)

      if (lookup !== null) {
        this.ctx.info('Found existing thread mapping', {
          mailId,
          spaceId,
          threadId: lookup.threadId,
          email
        })
        return lookup.threadId
      }

      return undefined
    } catch (error) {
      this.ctx.error('Failed to lookup thread for email', { mailId, spaceId, error })
      return undefined
    }
  }

  async setThreadId (mailId: string, spaceId: Ref<Space>, threadId: Ref<Card>, email: string): Promise<void> {
    try {
      const key = this.getLookupKey(mailId, spaceId, email)

      const lookupInfo: ThreadInfo = {
        threadId
      }

      await this.keyValueClient.setValue(key, lookupInfo)

      this.ctx.info('Saved thread mapping', {
        mailId,
        spaceId,
        threadId
      })
    } catch (error) {
      this.ctx.error('Failed to save thread mapping', { mailId, spaceId, threadId, error })
    }
  }

  async getParentThreadId (
    inReplyTo: string | undefined,
    spaceId: Ref<Space>,
    email: string
  ): Promise<Ref<Card> | undefined> {
    if (inReplyTo === undefined) {
      return undefined
    }

    return await this.getThreadId(inReplyTo, spaceId, email)
  }

  async deleteMapping (mailId: string, spaceId: Ref<Space>, email: string): Promise<void> {
    try {
      const key = this.getLookupKey(mailId, spaceId, email)
      await this.keyValueClient.deleteKey(key)
      this.ctx.info('Deleted thread mapping', { mailId, spaceId })
    } catch (error) {
      this.ctx.error('Failed to delete thread mapping', { mailId, spaceId, error })
    }
  }

  private getLookupKey (mailId: string, spaceId: Ref<Space>, email: string): string {
    return `mail-thread-lookup:${mailId}:${spaceId}:${email}`
  }
}
