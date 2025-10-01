//
// Copyright © 2022 Hardcore Engineering Inc.
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
  type Account,
  type AccountUuid,
  type MeasureContext,
  type PermissionsGrant,
  type PersonId,
  type Ref,
  type SocialId,
  type SocialStringsToUsers,
  type Space,
  type WorkspaceDataId,
  type WorkspaceIds
} from '@hcengineering/core'
import { type Token } from '@hcengineering/server-token'
import type { StatisticsElement } from './stats'
import { type Session, type SessionRequest } from './types'
import { SessionDataImpl } from './utils'

/**
 * @public
 */
export class ClientSession implements Session {
  createTime = Date.now()
  requests = new Map<string, SessionRequest>()
  binaryMode: boolean = false
  useCompression: boolean = false
  lastRequest = Date.now()

  lastPing: number = Date.now()

  total: StatisticsElement = { find: 0, tx: 0 }
  current: StatisticsElement = { find: 0, tx: 0 }
  mins5: StatisticsElement = { find: 0, tx: 0 }
  measures: { id: string, message: string, time: 0 }[] = []
  isAdmin: boolean

  constructor (
    readonly token: Token,
    readonly sessionId: string,
    readonly workspace: WorkspaceIds,
    readonly account: Account,
    readonly allowUpload: boolean
  ) {
    this.isAdmin = this.token.extra?.admin === 'true'
  }

  getUser (): AccountUuid {
    return this.token.account
  }

  getUserSocialIds (): PersonId[] {
    return this.account.socialIds
  }

  getSocialIds (): SocialId[] {
    return this.account.fullSocialIds
  }

  getRawAccount (): Account {
    return this.account
  }

  isUpgradeClient (): boolean {
    return this.token.extra?.model === 'upgrade'
  }

  getMode (): string {
    return this.token.extra?.mode ?? 'normal'
  }

  updateLast (opt?: { find?: boolean, tx?: boolean }): void {
    this.lastRequest = Date.now()
    if (opt?.find === true) {
      this.total.find++
      this.current.find++
    }
    if (opt?.tx === true) {
      this.total.tx++
      this.current.tx++
    }
  }

  private getPermissionsGrant (): PermissionsGrant | undefined {
    if (this.token.grant == null) {
      return
    }

    return {
      spaces: this.token.grant?.spaces as Ref<Space>[] | undefined,
      grantedBy: this.token.grant?.grantedBy
    }
  }

  includeSessionContext (ctx: MeasureContext, socialStringsToUsers: SocialStringsToUsers): void {
    const dataId = this.workspace.dataId ?? (this.workspace.uuid as unknown as WorkspaceDataId)
    const contextData = new SessionDataImpl(
      this.account,
      this.sessionId,
      this.isAdmin,
      undefined,
      {
        ...this.workspace,
        dataId
      },
      false,
      undefined,
      undefined,
      socialStringsToUsers,
      this.token.extra?.service ?? '🤦‍♂️user',
      this.getPermissionsGrant()
    )
    ctx.contextData = contextData
  }
}
