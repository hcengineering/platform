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

import { MeasureContext, PersonId, Ref, Space, TxOperations, WorkspaceUuid, generateId } from '@hcengineering/core'
import { type Card } from '@hcengineering/card'
import chat from '@hcengineering/chat'
import mail from '@hcengineering/mail'
import { SyncMutex } from './mutex'
import { MessageTimeShift, normalizeEmail } from './utils'

const createMutex = new SyncMutex()

/**
 * Caches channel references to reduce calls to create mail channels
 */
export class ChannelCache {
  // Key is `${spaceId}:${normalizedEmail}`
  private readonly cache = new Map<string, Ref<Card>>()

  constructor (
    private readonly ctx: MeasureContext,
    private readonly client: TxOperations,
    private readonly workspace: WorkspaceUuid
  ) {}

  /**
   * Gets or creates a mail channel with caching
   */
  async getOrCreateChannel (
    spaceId: Ref<Space>,
    participants: PersonId[],
    email: string,
    owner: PersonId
  ): Promise<Ref<Card>> {
    const normalizedEmail = normalizeEmail(email)
    const cacheKey = `${spaceId}:${normalizedEmail}`

    let channel = this.cache.get(cacheKey)
    if (channel != null) {
      return channel
    }

    channel = await this.fetchOrCreateChannel(spaceId, participants, normalizedEmail, owner)
    if (channel != null) {
      this.cache.set(cacheKey, channel)
    }

    return channel
  }

  clearCache (spaceId: Ref<Space>, email: string): void {
    const normalizedEmail = normalizeEmail(email)
    this.cache.delete(`${spaceId}:${normalizedEmail}`)
  }

  clearAllCache (): void {
    this.cache.clear()
  }

  get size (): number {
    return this.cache.size
  }

  private async fetchOrCreateChannel (
    space: Ref<Space>,
    participants: PersonId[],
    email: string,
    personId: PersonId
  ): Promise<Ref<Card>> {
    const normalizedEmail = normalizeEmail(email)
    try {
      // First try to find existing channel
      const channel = await this.client.findOne(mail.tag.MailThread, { title: normalizedEmail })

      if (channel != null) {
        this.ctx.info('Using existing channel', { me: normalizedEmail, space, channel: channel._id })
        return channel._id as Ref<Card>
      }

      return await this.createNewChannel(space, participants, normalizedEmail, personId)
    } catch (err) {
      this.ctx.error('Failed to create channel', {
        me: normalizedEmail,
        space,
        workspace: this.workspace,
        error: err instanceof Error ? err.message : String(err)
      })

      // Remove failed lookup from cache
      this.cache.delete(`${space}:${normalizedEmail}`)

      throw new Error(
        `Failed to create channel for ${normalizedEmail} in space ${space}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  private async createNewChannel (
    space: Ref<Space>,
    participants: PersonId[],
    email: string,
    personId: PersonId
  ): Promise<Ref<Card>> {
    const normalizedEmail = normalizeEmail(email)
    const mutexKey = `channel:${this.workspace}:${space}:${normalizedEmail}`
    const releaseLock = await createMutex.lock(mutexKey)

    try {
      // Double-check that channel doesn't exist after acquiring lock
      const existingChannel = await this.client.findOne(mail.tag.MailThread, { title: normalizedEmail })
      if (existingChannel != null) {
        this.ctx.info('Using existing channel (found after mutex lock)', {
          me: normalizedEmail,
          space,
          channel: existingChannel._id
        })
        return existingChannel._id as Ref<Card>
      }

      // Create new channel if it doesn't exist
      this.ctx.info('Creating new channel', { me: normalizedEmail, space, personId })
      const channelId = await this.client.createDoc(
        chat.masterTag.Thread,
        space,
        {
          title: normalizedEmail,
          private: true,
          members: participants,
          archived: false,
          createdBy: personId,
          modifiedBy: personId
        },
        generateId(),
        Date.now() + MessageTimeShift.Channel,
        personId
      )

      this.ctx.info('Creating mixin', { me: normalizedEmail, space, personId, channelId })
      await this.client.createMixin(
        channelId,
        chat.masterTag.Thread,
        space,
        mail.tag.MailThread,
        {},
        Date.now() + MessageTimeShift.MailTag,
        personId
      )

      return channelId as Ref<Card>
    } finally {
      releaseLock()
    }
  }
}

/**
 * Factory for creating ChannelCache instances per workspace
 */
export const ChannelCacheFactory = {
  instances: new Map<WorkspaceUuid, ChannelCache>(),

  getInstance (ctx: MeasureContext, client: TxOperations, workspace: WorkspaceUuid): ChannelCache {
    let instance = ChannelCacheFactory.instances.get(workspace)

    if (instance === undefined) {
      instance = new ChannelCache(ctx, client, workspace)
      ChannelCacheFactory.instances.set(workspace, instance)
    }

    return instance
  },

  resetInstance (workspace: WorkspaceUuid): void {
    ChannelCacheFactory.instances.delete(workspace)
  },

  resetAllInstances (): void {
    ChannelCacheFactory.instances.clear()
  },

  get instanceCount (): number {
    return ChannelCacheFactory.instances.size
  }
}
