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

import { MeasureContext, PersonId, Ref } from '@hcengineering/core'
import { type KeyValueClient } from '@hcengineering/kvs-client'
import { Card } from '@hcengineering/card'
import { PersonSpace } from '@hcengineering/contact'

export interface ThreadLookupInfo {
  mailId: string
  spaceId: Ref<PersonSpace>
  threadId: Ref<Card>
  timestamp: number
}

/**
 * Service that manages mappings between emails and threads in spaces
 */
export class ThreadLookupService {
  private static instance: ThreadLookupService | undefined

  private constructor (
    private readonly keyValueClient: KeyValueClient,
    private readonly ctx: MeasureContext
  ) {}

  static getInstance (ctx: MeasureContext, keyValueClient: KeyValueClient): ThreadLookupService {
    if (ThreadLookupService.instance === undefined) {
      ThreadLookupService.instance = new ThreadLookupService(keyValueClient, ctx)
    }

    return ThreadLookupService.instance
  }

  async getThreadId (workspace: string, mailId: string, spaceId: Ref<PersonSpace>): Promise<Ref<Card> | undefined> {
    try {
      const key = this.getLookupKey(workspace, mailId, spaceId)
      const lookup = await this.keyValueClient.getValue<ThreadLookupInfo>(key)

      if (lookup !== null) {
        this.ctx.info('Found existing thread mapping', {
          workspace,
          mailId,
          spaceId,
          threadId: lookup.threadId,
          timestamp: lookup.timestamp
        })
        return lookup.threadId
      }

      return undefined
    } catch (error) {
      this.ctx.error('Failed to lookup thread for email', { workspace, mailId, spaceId, error })
      return undefined
    }
  }

  async setThreadId (
    workspace: string,
    mailId: string,
    spaceId: Ref<PersonSpace>,
    threadId: Ref<Card>,
    owner: PersonId
  ): Promise<void> {
    try {
      const key = this.getLookupKey(workspace, mailId, spaceId)

      const lookupInfo: ThreadLookupInfo = {
        mailId,
        spaceId,
        threadId,
        timestamp: Date.now()
      }

      await this.keyValueClient.setValue(key, lookupInfo)

      this.ctx.info('Saved thread mapping', {
        workspace,
        mailId,
        spaceId,
        threadId,
        timestamp: lookupInfo.timestamp
      })
    } catch (error) {
      this.ctx.error('Failed to save thread mapping', { workspace, mailId, spaceId, threadId, error })
    }
  }

  async getParentThreadId (
    workspace: string,
    inReplyTo: string | undefined,
    spaceId: Ref<PersonSpace>
  ): Promise<Ref<Card> | undefined> {
    if (inReplyTo === undefined) {
      return undefined
    }

    return await this.getThreadId(workspace, inReplyTo, spaceId)
  }

  async deleteMapping (workspace: string, mailId: string, spaceId: Ref<PersonSpace>): Promise<void> {
    try {
      const key = this.getLookupKey(workspace, mailId, spaceId)
      await this.keyValueClient.deleteKey(key)
      this.ctx.info('Deleted thread mapping', { workspace, mailId, spaceId })
    } catch (error) {
      this.ctx.error('Failed to delete thread mapping', { workspace, mailId, spaceId, error })
    }
  }

  private getLookupKey (workspace: string, mailId: string, spaceId: Ref<PersonSpace>): string {
    return `mail-thread-lookup:${workspace}:${mailId}:${spaceId}`
  }
}
