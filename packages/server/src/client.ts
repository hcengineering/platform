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

import { DbAdapter } from '@hcengineering/communication-sdk-types'
import type {
  CardID, FindMessagesOptions,
  Message,
  MessageID,
  MessageMeta,
  PersonUuid,
  SocialID,
  WorkspaceUuid
} from '@hcengineering/communication-types'
import { generateToken } from '@hcengineering/server-token'
import { Account, MeasureContext, systemAccountUuid } from '@hcengineering/core'
import { getClient as getAccountClient } from '@hcengineering/account-client'
import { loadMessages } from '@hcengineering/communication-shared'

import { Blob } from './blob'
import type { Metadata } from './types'
import { getClient, HulylakeClient } from '@hcengineering/hulylake-client'

export class LowLevelClient {
  private readonly messageMetaCache = new Map<string, MessageMeta>()
  private readonly personUuidBySocialIdCache = new Map<SocialID, PersonUuid>()
  private readonly lake: HulylakeClient

  constructor (
    readonly db: DbAdapter,
    readonly blob: Blob,
    private readonly metadata: Metadata,
    private readonly workspace: WorkspaceUuid
  ) {
    this.lake = getClient(metadata.hulylakeUrl, workspace, generateToken(systemAccountUuid, workspace, undefined, metadata.secret))
  }

  async findMessage (cardId: CardID, messageId: MessageID, options?: FindMessagesOptions): Promise<Message | undefined> {
    const meta = await this.getMessageMeta(cardId, messageId)
    if (meta === undefined) {
      return undefined
    }

    return (await loadMessages(this.lake, meta.blobId, {
      cardId,
      id: messageId
    }, options))[0]
  }

  async findPersonUuid (ctx: {
    ctx: MeasureContext
    account: Account
  }, socialId: SocialID, requireAccount: boolean = false): Promise<PersonUuid | undefined> {
    if (ctx.account.socialIds.includes(socialId)) {
      return ctx.account.uuid
    }
    const cached = this.personUuidBySocialIdCache.get(socialId)
    if (cached !== undefined) {
      return cached
    }

    const url = this.metadata.accountsUrl ?? ''
    if (url === '') return undefined

    const token = generateToken(systemAccountUuid, this.workspace, undefined, this.metadata.secret)
    const accountClient = getAccountClient(this.metadata.accountsUrl, token)

    try {
      const personUuid = await accountClient.findPersonBySocialId(socialId, requireAccount)

      if (personUuid !== undefined) {
        this.personUuidBySocialIdCache.set(socialId, personUuid)
      }

      return personUuid
    } catch (err: any) {
      ctx.ctx.warn('Cannot find person uuid', { socialString: socialId, err })
    }
  }

  async getMessageMeta (cardId: CardID, messageId: MessageID): Promise<MessageMeta | undefined> {
    const key = this.getMessageMetaKey(cardId, messageId)
    if (this.messageMetaCache.has(key)) {
      return this.messageMetaCache.get(key)
    }
    const meta = (await this.db.findMessagesMeta({ cardId, id: messageId }))[0]
    if (meta === undefined) {
      return undefined
    }
    this.messageMetaCache.set(key, meta)
    return meta
  }

  private getMessageMetaKey (cardId: CardID, messageId: MessageID): string {
    return `${cardId}-${messageId}`
  }

  async removeMessageMeta (cardId: CardID, messageId: MessageID): Promise<void> {
    await this.db.removeMessageMeta(cardId, messageId)
    const key = this.getMessageMetaKey(cardId, messageId)
    this.messageMetaCache.delete(key)
  }
}
