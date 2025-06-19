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
  isArchivingMode,
  isDeletingMode,
  MeasureContext,
  RateLimiter,
  WorkspaceInfoWithStatus,
  WorkspaceUuid,
  type PersonId
} from '@hcengineering/core'
import { normalizeEmail } from '@hcengineering/mail-common'
import type { StorageAdapter } from '@hcengineering/server-core'

import { getAccountClient } from '@hcengineering/server-client'
import { decode64 } from './base64'
import config from './config'
import { type GmailClient } from './gmail'
import { getIntegrations } from './integrations'
import { getWorkspaceTokens } from './tokens'
import { type ProjectCredentials, type Token, type User } from './types'
import { serviceToken } from './utils'
import { WorkspaceClient } from './workspaceClient'

import { AuthProvider } from './gmail/auth'
import { AccountClient } from '@hcengineering/account-client'

export class GmailController {
  private readonly workspaces: Map<string, WorkspaceClient> = new Map<string, WorkspaceClient>()

  private readonly credentials: ProjectCredentials
  private readonly clients: Map<PersonId, Map<WorkspaceUuid, GmailClient>> = new Map<
  PersonId,
  Map<WorkspaceUuid, GmailClient>
  >()

  private readonly personIdByEmail = new Map<string, PersonId>()

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
    try {
      const token = serviceToken()
      const sysClient = getAccountClient(token)
      const integrations = await getIntegrations(sysClient, token)
      this.ctx.info('Start integrations', { count: integrations.length })

      const workspaceIds = new Set<WorkspaceUuid>(
        integrations
          .map((integration) => {
            if (integration.workspaceUuid == null) {
              this.ctx.info('No workspace found', { integration })
              return undefined
            }
            return integration.workspaceUuid
          })
          .filter((id): id is WorkspaceUuid => id != null)
      )
      const pendingWorkspaces = await this.startWorkspaces(workspaceIds, sysClient)
      this.ctx.info('Pending workspaces', { count: pendingWorkspaces.size })
      // Start async check for pending workspaces
      void this.checkPendingWorkspaces(pendingWorkspaces, sysClient)
    } catch (err: any) {
      this.ctx.error('Failed to start existing integrations', { error: err.message })
    }
  }

  async checkPendingWorkspaces (workspaceIds: Set<WorkspaceUuid>, sysClient: AccountClient): Promise<void> {
    try {
      let unprocessedWorkspaces = new Set(workspaceIds)
      while (unprocessedWorkspaces.size > 0) {
        unprocessedWorkspaces = await this.startWorkspaces(unprocessedWorkspaces, sysClient)
        if (unprocessedWorkspaces.size > 0) {
          this.ctx.info('Waiting for pending workspaces', { count: unprocessedWorkspaces.size })
          await new Promise<void>((resolve) => {
            setTimeout(
              () => {
                resolve()
              },
              5 * 60 * 1000
            ) // Wait 5 minutes
          })
        }
      }
    } catch (err: any) {
      this.ctx.error('Failed to check pending workspaces', { error: err.message, workspaceIds })
    }
  }

  async startWorkspaces (workspaceIds: Set<WorkspaceUuid>, sysClient: AccountClient): Promise<Set<WorkspaceUuid>> {
    const unprocessedWorkspaces = new Set(workspaceIds)
    const limiter = new RateLimiter(config.InitLimit)
    this.ctx.info('Workspaces with integrations', { count: unprocessedWorkspaces.size })

    const workspaceWithInfo = await sysClient.getWorkspacesInfo(Array.from(unprocessedWorkspaces))

    const allTokens = await getWorkspaceTokens(sysClient)

    for (const info of workspaceWithInfo) {
      const workspace = info.uuid
      try {
        const { needSync, needRecheck } = this.checkWorkspace(info)
        if (!needSync) {
          if (!needRecheck) unprocessedWorkspaces.delete(workspace)
          continue
        }

        // So we will not start it one more time.
        unprocessedWorkspaces.delete(workspace)

        const tokens = allTokens.get(workspace) ?? []
        await limiter.add(async () => {
          this.ctx.info('Use stored tokens', { count: tokens.length })
          const startPromise = this.startWorkspace(workspace, tokens)
          const timeoutPromise = new Promise<void>((resolve) => {
            setTimeout(() => {
              // Not connected, recheck again.
              unprocessedWorkspaces.add(workspace)
              resolve()
            }, 60000)
          })
          await Promise.race([startPromise, timeoutPromise])
        })
      } catch (err: any) {
        this.ctx.error('Failed to create workspace client', { workspaceUuid: workspace, error: err.message })
      }
    }

    await limiter.waitProcessing()
    return unprocessedWorkspaces
  }

  checkWorkspace (info: WorkspaceInfoWithStatus): { needSync: boolean, needRecheck: boolean } {
    if (isArchivingMode(info.mode) || isDeletingMode(info.mode)) {
      this.ctx.info('workspace is in archiving or deleting mode, skipping', { workspaceUuid: info.uuid })
      return { needSync: false, needRecheck: false }
    }
    if (!isActiveMode(info.mode)) {
      this.ctx.info('workspace is not active, skipping for now.', { workspaceUuid: info.uuid })
      return { needSync: false, needRecheck: true }
    }
    const lastVisit = (Date.now() - (info.lastVisit ?? 0)) / (3600 * 24 * 1000) // In days

    if (lastVisit > config.WorkspaceInactivityInterval) {
      this.ctx.warn('workspace is inactive for too long, skipping for now.', { workspaceUuid: info.uuid })
      return { needSync: false, needRecheck: true }
    }
    return { needSync: true, needRecheck: false }
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
      } catch (err: any) {
        this.ctx.error("Couldn't create client", {
          workspaceUuid: workspace,
          userId: token.userId,
          message: err.message
        })
      }
    }
    this.ctx.info('Start clients sync', { workspaceUuid: workspace, count: clients.length })
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
    const socialId = this.personIdByEmail.get(normalizeEmail(email))
    if (socialId === undefined) {
      this.ctx.warn('No socialId found for email', { email })
      return
    }

    const clients = this.clients.get(socialId)
    if (clients === undefined) {
      this.ctx.info('No clients found', { email, socialId })
      return
    }
    this.ctx.info('Processing push', { clients: clients.size, email })
    for (const client of clients.values()) {
      void client.sync()
    }
  }

  addClient (socialId: PersonId, workspace: WorkspaceUuid, email: string, client: GmailClient): void {
    let userClients = this.clients.get(socialId)
    if (userClients === undefined) {
      userClients = new Map<WorkspaceUuid, GmailClient>()
      this.clients.set(socialId, userClients)
    }
    this.personIdByEmail.set(normalizeEmail(email), socialId)

    const existingClient = userClients.get(workspace)
    if (existingClient != null) {
      void existingClient.close().catch((err) => {
        this.ctx.error('Error closing existing client', {
          socialId,
          workspace,
          error: err.message
        })
      })
    }

    userClients.set(workspace, client)
  }

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
