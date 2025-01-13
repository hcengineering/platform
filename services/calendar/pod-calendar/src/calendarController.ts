//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { Account, isActiveMode, RateLimiter, Ref, systemAccountEmail } from '@hcengineering/core'
import { type Db } from 'mongodb'
import { type CalendarClient } from './calendar'
import config from './config'
import { type ProjectCredentials, type Token, type User } from './types'
import { WorkspaceClient } from './workspaceClient'
import { getWorkspaceInfo } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'

export class CalendarController {
  private readonly workspaces: Map<string, WorkspaceClient> = new Map<string, WorkspaceClient>()

  private readonly credentials: ProjectCredentials
  private readonly clients: Map<string, CalendarClient[]> = new Map<string, CalendarClient[]>()
  private readonly initLimitter = new RateLimiter(config.InitLimit)

  protected static _instance: CalendarController

  private constructor (private readonly mongo: Db) {
    this.credentials = JSON.parse(config.Credentials)
    CalendarController._instance = this
  }

  static getCalendarController (mongo?: Db): CalendarController {
    if (CalendarController._instance !== undefined) {
      return CalendarController._instance
    }
    if (mongo === undefined) throw new Error('CalendarController not exist')
    return new CalendarController(mongo)
  }

  async startAll (): Promise<void> {
    const tokens = await this.mongo.collection<Token>('tokens').find().toArray()
    const groups = new Map<string, Token[]>()
    console.log('start calendar service', tokens.length)
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
    console.log('Calendar service started')
  }

  async startWorkspace (workspace: string, tokens: Token[]): Promise<void> {
    const workspaceClient = await this.getWorkspaceClient(workspace)
    const clients: CalendarClient[] = []
    for (const token of tokens) {
      try {
        const timeout = setTimeout(() => {
          console.log('init client hang', token.workspace, token.userId)
        }, 60000)
        const client = await workspaceClient.createCalendarClient(token)
        clearTimeout(timeout)
        clients.push(client)
      } catch (err) {
        console.error(`Couldn't create client for ${workspace} ${token.userId} ${token.email}`)
      }
    }
    for (const client of clients) {
      void this.initLimitter.add(async () => {
        await client.startSync()
      })
    }
    void workspaceClient.sync()
    console.log('Workspace started', workspace)
  }

  push (email: string, mode: 'events' | 'calendar', calendarId?: string): void {
    const clients = this.clients.get(email)
    for (const client of clients ?? []) {
      if (mode === 'calendar') {
        void client.syncCalendars(email)
      }
      if (mode === 'events' && calendarId !== undefined) {
        void client.sync(calendarId, email)
      }
    }
  }

  addClient (email: string, client: CalendarClient): void {
    const clients = this.clients.get(email)
    if (clients === undefined) {
      this.clients.set(email, [client])
    } else {
      clients.push(client)
      this.clients.set(email, clients)
    }
  }

  removeClient (email: string): void {
    const clients = this.clients.get(email)
    if (clients !== undefined) {
      this.clients.set(
        email,
        clients.filter((p) => !p.isClosed)
      )
    }
  }

  async getUserId (email: string, workspace: string): Promise<Ref<Account>> {
    const workspaceClient = await this.getWorkspaceClient(workspace)
    return await workspaceClient.getUserId(email)
  }

  async signout (workspace: string, value: string): Promise<void> {
    const workspaceClient = await this.getWorkspaceClient(workspace)
    const clients = await workspaceClient.signout(value)
    if (clients === 0) {
      this.workspaces.delete(workspace)
    }
  }

  removeWorkspace (workspace: string): void {
    this.workspaces.delete(workspace)
  }

  async close (): Promise<void> {
    for (const workspace of this.workspaces.values()) {
      await workspace.close()
    }
    this.workspaces.clear()
  }

  async createClient (user: Token): Promise<CalendarClient> {
    const workspace = await this.getWorkspaceClient(user.workspace)
    const newClient = await workspace.createCalendarClient(user)
    return newClient
  }

  async newClient (user: User, code: string): Promise<CalendarClient> {
    const workspace = await this.getWorkspaceClient(user.workspace)
    const newClient = await workspace.newCalendarClient(user, code)
    return newClient
  }

  private async getWorkspaceClient (workspace: string): Promise<WorkspaceClient> {
    let res = this.workspaces.get(workspace)
    if (res === undefined) {
      try {
        res = await WorkspaceClient.create(this.credentials, this.mongo, workspace, this)
        this.workspaces.set(workspace, res)
      } catch (err) {
        console.error(`Couldn't create workspace worker for ${workspace}, reason: ${JSON.stringify(err)}`)
        throw err
      }
    }
    return res
  }
}
