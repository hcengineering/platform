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

import { MeasureContext } from '@hcengineering/core'
import type { StorageAdapter } from '@hcengineering/server-core'

import { type Db } from 'mongodb'
import { decode64 } from './base64'
import config from './config'
import { type GmailClient } from './gmail'
import { type ProjectCredentials, type Token, type User } from './types'
import { WorkspaceClient } from './workspaceClient'

export class GmailController {
  private readonly workspaces: Map<string, WorkspaceClient> = new Map<string, WorkspaceClient>()

  private readonly credentials: ProjectCredentials
  private readonly clients: Map<string, GmailClient[]> = new Map<string, GmailClient[]>()

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
    for (const token of tokens) {
      try {
        await this.createClient(token)
      } catch (err) {
        console.error(`Couldn't create client for ${token.workspace} ${token.userId}`)
      }
    }

    for (const client of this.workspaces.values()) {
      void client.checkUsers().then(async () => {
        await client.getNewMessages()
      })
    }
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
        res = await WorkspaceClient.create(this.ctx, this.credentials, this.mongo, this.storageAdapter, workspace)
        this.workspaces.set(workspace, res)
      } catch (err) {
        console.error(`Couldn't create workspace worker for ${workspace}, reason: `, err)
        throw err
      }
    }
    return res
  }
}
