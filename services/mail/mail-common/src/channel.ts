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

import {
  MeasureContext,
  PersonId,
  Ref,
  TxOperations,
  Doc,
  WorkspaceUuid,
  generateId,
  SocialId
} from '@hcengineering/core'
import chat from '@hcengineering/chat'
import mail from '@hcengineering/mail'
import { PersonSpace } from '@hcengineering/contact'
import { SyncMutex } from './mutex'

const createMutex = new SyncMutex()

/**
 * Caches channel references to reduce calls to create mail channels
 */
export class ChannelCache {
  // Key is `${spaceId}:${emailAccount}`
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
    emailAccount: string,
    socialId: SocialId
  ): Promise<Ref<Doc> | undefined> {
    const cacheKey = `${spaceId}:${emailAccount}`

    let channel = this.cache.get(cacheKey)
    if (channel != null) {
      return channel
    }

    channel = await this.fetchOrCreateChannel(spaceId, participants, emailAccount, socialId)
    if (channel != null) {
      this.cache.set(cacheKey, channel)
    }

    return channel
  }

  clearCache (spaceId: Ref<PersonSpace>, emailAccount: string): void {
    this.cache.delete(`${spaceId}:${emailAccount}`)
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
    emailAccount: string,
    socialId: SocialId
  ): Promise<Ref<Doc> | undefined> {
    try {
      // First try to find existing channel
      const channel = await this.client.findOne(mail.tag.MailChannel, { title: emailAccount })

      if (channel != null) {
        this.ctx.info('Using existing channel', { me: emailAccount, space, channel: channel._id })
        return channel._id
      }

      return await this.createNewChannel(space, participants, emailAccount, socialId)
    } catch (err) {
      this.ctx.error('Failed to create channel', {
        me: emailAccount,
        space,
        workspace: this.workspace,
        error: err instanceof Error ? err.message : String(err)
      })

      // Remove failed lookup from cache
      this.cache.delete(`${space}:${emailAccount}`)

      return undefined
    }
  }

  private async createNewChannel (
    space: Ref<PersonSpace>,
    participants: PersonId[],
    emailAccount: string,
    socialId: SocialId
  ): Promise<Ref<Doc> | undefined> {
    const mutexKey = `channel:${this.workspace}:${space}:${emailAccount}`
    const releaseLock = await createMutex.lock(mutexKey)

    try {
      // Double-check that channel doesn't exist after acquiring lock
      const existingChannel = await this.client.findOne(mail.tag.MailChannel, { title: emailAccount })
      if (existingChannel != null) {
        this.ctx.info('Using existing channel (found after mutex lock)', {
          me: emailAccount,
          space,
          channel: existingChannel._id
        })
        return existingChannel._id
      }

      // Create new channel if it doesn't exist
      this.ctx.info('Creating new channel', { me: emailAccount, space, personId: socialId._id })
      const channelId = await this.client.createDoc(
        chat.masterTag.Channel,
        space,
        {
          title: emailAccount,
          private: true,
          members: participants,
          archived: false,
          createdBy: socialId._id,
          modifiedBy: socialId._id
        },
        generateId(),
        Date.now(),
        socialId._id
      )

      this.ctx.info('Creating mixin', { me: emailAccount, space, personId: socialId._id, channelId })
      await this.client.createMixin(
        channelId,
        chat.masterTag.Channel,
        space,
        mail.tag.MailChannel,
        {},
        Date.now(),
        socialId._id
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
