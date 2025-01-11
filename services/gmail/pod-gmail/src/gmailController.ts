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

import { isActiveMode, MeasureContext, RateLimiter, systemAccountEmail } from '@hcengineering/core'
import type { StorageAdapter } from '@hcengineering/server-core'

import { type Db } from 'mongodb'
import { decode64 } from './base64'
import config from './config'
import { type GmailClient } from './gmail'
import { type ProjectCredentials, type Token, type User } from './types'
import { WorkspaceClient } from './workspaceClient'
import { generateToken } from '@hcengineering/server-token'
import { getWorkspaceInfo } from '@hcengineering/server-client'

export class GmailController {
  private readonly workspaces: Map<string, WorkspaceClient> = new Map<string, WorkspaceClient>()

  private readonly credentials: ProjectCredentials
  private readonly clients: Map<string, GmailClient[]> = new Map<string, GmailClient[]>()
  private readonly initLimitter = new RateLimiter(config.InitLimit)

  protected static _instance: GmailController

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly mongo: Db,
    private readonly storageAdapter: StorageAdapter
  ) {
    this.credentials = JSON.parse(config.Credentials)
    GmailController._instance = this
  }

  static create (ctx: MeasureContext, mongo: Db, storageAdapter: StorageAdapter): GmailController {
    if (GmailController._instance !== undefined) {
      throw new Error('GmailController already exists')
    }
    return new GmailController(ctx, mongo, storageAdapter)
  }

  static getGmailController (): GmailController {
    if (GmailController._instance !== undefined) {
      return GmailController._instance
    }
    throw new Error('GmailController not exist')
  }

  async startAll (): Promise<void> {
    const tokens = await this.mongo.collection<Token>('tokens').find().toArray()
    const groups = new Map<string, Token[]>()
    console.log('start gmail service', tokens.length)
    for (const token of tokens) {
      const group = groups.get(token.workspace)
      if (group === undefined) {
        groups.set(token.workspace, [token])
      } else {
        group.push(token)
        groups.set(token.workspace, group)
      }
    }

    const limiter = new RateLimiter(config.InitLimit)
    for (const [workspace, tokens] of groups) {
      await limiter.add(async () => {
        const wstok = generateToken(systemAccountEmail, { name: workspace })
        const info = await getWorkspaceInfo(wstok)
        if (info === undefined) {
          console.log('workspace not found', workspace)
          return
        }
        if (!isActiveMode(info.mode)) {
          console.log('workspace is not active', workspace)
          return
        }
        const startPromise = this.startWorkspace(workspace, tokens)
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

  async startWorkspace (workspace: string, tokens: Token[]): Promise<void> {
    const workspaceClient = await this.getWorkspaceClient(workspace)
    const clients: GmailClient[] = []
    for (const token of tokens) {
      try {
        const timeout = setTimeout(() => {
          console.log('init client hang', token.workspace, token.userId)
        }, 60000)
        const client = await workspaceClient.createGmailClient(token)
        clearTimeout(timeout)
        clients.push(client)
      } catch (err) {
        console.error(`Couldn't create client for ${workspace} ${token.userId}`)
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

  addClient (email: string, client: GmailClient): void {
    const clients = this.clients.get(email)
    if (clients === undefined) {
      this.clients.set(email, [client])
    } else {
      clients.push(client)
      this.clients.set(email, clients)
    }
  }

  async getGmailClient (email: string, workspace: string, token: string): Promise<GmailClient> {
    const workspaceClient = await this.getWorkspaceClient(workspace)
    const userId = await workspaceClient.getUserId(email)
    return await workspaceClient.createGmailClient({ userId, workspace, token })
  }

  async signout (workspace: string, email: string): Promise<void> {
    const workspaceClient = await this.getWorkspaceClient(workspace)
    const clients = await workspaceClient.signout(email)
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

  async createClient (user: User | Token): Promise<GmailClient> {
    const workspace = await this.getWorkspaceClient(user.workspace)
    const newClient = await workspace.createGmailClient(user)
    return newClient
  }

  private async getWorkspaceClient (workspace: string): Promise<WorkspaceClient> {
    let res = this.workspaces.get(workspace)
    if (res === undefined) {
      try {
        console.log('create workspace worker for', workspace)
        res = await WorkspaceClient.create(this.ctx, this.credentials, this.mongo, this.storageAdapter, workspace)
        this.workspaces.set(workspace, res)
        console.log('created workspace worker for', workspace)
      } catch (err) {
        console.error(`Couldn't create workspace worker for ${workspace}, reason: `, err)
        throw err
      }
    }
    return res
  }
}
