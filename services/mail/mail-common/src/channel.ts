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

import { MeasureContext, PersonId, Ref, TxOperations, Doc, WorkspaceUuid, generateId } from '@hcengineering/core'
import chat from '@hcengineering/chat'
import mail from '@hcengineering/mail'
import { PersonSpace } from '@hcengineering/contact'
import { SyncMutex } from './mutex'

const createMutex = new SyncMutex()

/**
 * Caches channel references to reduce calls to create mail channels
 */
export class ChannelCache {
  // Key is `${spaceId}:${normalizedEmail}`
  private readonly cache = new Map<string, Ref<Doc>>()

  constructor (
    private readonly ctx: MeasureContext,
    private readonly client: TxOperations,
    private readonly workspace: WorkspaceUuid
  ) {}

  /**
   * Gets or creates a mail channel with caching
   */
  async getOrCreateChannel (
    spaceId: Ref<PersonSpace>,
    participants: PersonId[],
    email: string,
    owner: PersonId
  ): Promise<Ref<Doc> | undefined> {
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

  clearCache (spaceId: Ref<PersonSpace>, email: string): void {
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
    space: Ref<PersonSpace>,
    participants: PersonId[],
    email: string,
    personId: PersonId
  ): Promise<Ref<Doc> | undefined> {
    const normalizedEmail = normalizeEmail(email)
    try {
      // First try to find existing channel
      const channel = await this.client.findOne(mail.tag.MailChannel, { title: normalizedEmail })

      if (channel != null) {
        this.ctx.info('Using existing channel', { me: normalizedEmail, space, channel: channel._id })
        return channel._id
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

      return undefined
    }
  }

  private async createNewChannel (
    space: Ref<PersonSpace>,
    participants: PersonId[],
    email: string,
    personId: PersonId
  ): Promise<Ref<Doc> | undefined> {
    const normalizedEmail = normalizeEmail(email)
    const mutexKey = `channel:${this.workspace}:${space}:${normalizedEmail}`
    const releaseLock = await createMutex.lock(mutexKey)

    try {
      // Double-check that channel doesn't exist after acquiring lock
      const existingChannel = await this.client.findOne(mail.tag.MailChannel, { title: normalizedEmail })
      if (existingChannel != null) {
        this.ctx.info('Using existing channel (found after mutex lock)', {
          me: normalizedEmail,
          space,
          channel: existingChannel._id
        })
        return existingChannel._id
      }

      // Create new channel if it doesn't exist
      this.ctx.info('Creating new channel', { me: normalizedEmail, space, personId })
      const channelId = await this.client.createDoc(
        chat.masterTag.Channel,
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
        Date.now(),
        personId
      )

      this.ctx.info('Creating mixin', { me: normalizedEmail, space, personId, channelId })
      await this.client.createMixin(
        channelId,
        chat.masterTag.Channel,
        space,
        mail.tag.MailChannel,
        {},
        Date.now(),
        personId
      )

      return channelId
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

function normalizeEmail (email: string): string {
  return email.toLowerCase().trim()
}
