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
  AccountUuid,
  isActiveMode,
  MeasureContext,
  RateLimiter,
  systemAccountUuid,
  WorkspaceUuid,
  type PersonId
} from '@hcengineering/core'
import type { StorageAdapter } from '@hcengineering/server-core'

import { decode64 } from './base64'
import config from './config'
import { type GmailClient } from './gmail'
import { type ProjectCredentials, type Token, type User } from './types'
import { WorkspaceClient } from './workspaceClient'
import { generateToken } from '@hcengineering/server-token'
import { getAccountClient } from '@hcengineering/server-client'
import { getIntegrations } from './accounts'
import { serviceToken } from './utils'
import { getWorkspaceTokens } from './tokens'

import { AuthProvider } from './gmail/auth'

export class GmailController {
  private readonly workspaces: Map<string, WorkspaceClient> = new Map<string, WorkspaceClient>()

  private readonly credentials: ProjectCredentials
  private readonly clients: Map<PersonId, GmailClient[]> = new Map<PersonId, GmailClient[]>()
  private readonly initLimitter = new RateLimiter(config.InitLimit)
  private readonly authProvider

  protected static _instance: GmailController

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly storageAdapter: StorageAdapter
  ) {
    this.credentials = JSON.parse(config.Credentials)
    this.authProvider = new AuthProvider(this.credentials)
    GmailController._instance = this
  }

  static create (ctx: MeasureContext, storageAdapter: StorageAdapter): GmailController {
    if (GmailController._instance !== undefined) {
      throw new Error('GmailController already exists')
    }
    return new GmailController(ctx, storageAdapter)
  }

  static getGmailController (): GmailController {
    if (GmailController._instance !== undefined) {
      return GmailController._instance
    }
    throw new Error('GmailController not exist')
  }

  async startAll (): Promise<void> {
    const integrations = await getIntegrations(serviceToken())

    const limiter = new RateLimiter(config.InitLimit)
    for (const integration of integrations) {
      if (integration.workspaceUuid === null) continue
      await limiter.add(async () => {
        if (integration.workspaceUuid === null) return
        const wstok = generateToken(systemAccountUuid, integration.workspaceUuid)
        const accountClient = getAccountClient(wstok)
        const info = await accountClient.getWorkspaceInfo()

        if (info === undefined) {
          this.ctx.info('workspace not found', { workspaceUuid: integration.workspaceUuid })
          return
        }
        if (!isActiveMode(info.mode)) {
          this.ctx.info('workspace is not active', { workspaceUuid: integration.workspaceUuid })
          return
        }
        const tokens = await getWorkspaceTokens(accountClient, integration.workspaceUuid)
        const startPromise = this.startWorkspace(integration.workspaceUuid, tokens)
        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve()
          }, 60000)
        })
        await Promise.race([startPromise, timeoutPromise])
      })
    }

    await limiter.waitProcessing()
  }

  async startWorkspace (workspace: WorkspaceUuid, tokens: Token[]): Promise<void> {
    const workspaceClient = await this.getWorkspaceClient(workspace)
    const clients: GmailClient[] = []
    for (const token of tokens) {
      try {
        const timeout = setTimeout(() => {
          this.ctx.info('init client hang', { workspaceUuid: token.workspace, userId: token.userId })
        }, 60000)
        const client = await workspaceClient.createGmailClient(token)
        clearTimeout(timeout)
        clients.push(client)
      } catch (err) {
        this.ctx.error("Couldn't create client", { workspaceUuid: workspace, userId: token.userId })
      }
    }
    for (const client of clients) {
      void this.initLimitter.add(async () => {
        await client.startSync()
      })
    }
    void workspaceClient.checkUsers().then(async () => {
      await workspaceClient.getNewMessages()
    })
  }

  push (message: string): void {
    const data = JSON.parse(decode64(message))
    const email = data.emailAddress
    const clients = this.clients.get(email)
    for (const client of clients ?? []) {
      void client.sync()
    }
  }

  addClient (socialId: PersonId, client: GmailClient): void {
    const clients = this.clients.get(socialId)
    if (clients === undefined) {
      this.clients.set(socialId, [client])
    } else {
      clients.push(client)
      this.clients.set(socialId, clients)
    }
  }

  /*
  async getGmailClient (userId: AccountUuid, workspace: WorkspaceUuid, token: string): Promise<GmailClient> {
    const workspaceClient = await this.getWorkspaceClient(workspace)
    return await workspaceClient.createGmailClient({ userId, workspace, token })
  }
  */

  getAuthProvider (): AuthProvider {
    return this.authProvider
  }

  async signout (workspace: WorkspaceUuid, account: AccountUuid): Promise<void> {
    const workspaceClient = await this.getWorkspaceClient(workspace)
    const clients = await workspaceClient.signoutByAccountId(account)
    if (clients === 0) {
      this.workspaces.delete(workspace)
    }
  }

  async close (): Promise<void> {
    for (const workspace of this.workspaces.values()) {
      await workspace.close()
    }
    this.workspaces.clear()
  }

  async createClient (user: User | Token, authCode?: string): Promise<GmailClient> {
    const workspace = await this.getWorkspaceClient(user.workspace)
    const newClient = await workspace.createGmailClient(user, authCode)
    return newClient
  }

  private async getWorkspaceClient (workspace: WorkspaceUuid): Promise<WorkspaceClient> {
    let res = this.workspaces.get(workspace)
    if (res === undefined) {
      try {
        this.ctx.info('create workspace worker', { workspaceUuid: workspace })
        res = await WorkspaceClient.create(this.ctx, this.credentials, this.storageAdapter, workspace)
        this.workspaces.set(workspace, res)
        this.ctx.info('created workspace worker', { workspaceUuid: workspace })
      } catch (err) {
        this.ctx.error("Couldn't create workspace worker", { workspaceUuid: workspace, reason: err })
        throw err
      }
    }
    return res
  }
}
