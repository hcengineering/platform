//
// Copyright © 2024 Hardcore Engineering Inc.
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
import { generateToken, Token } from '@hcengineering/server-token'
import { AnalyticEvent } from '@hcengineering/analytics-collector'
import {
  AccountRole,
  getWorkspaceId,
  MeasureContext,
  toWorkspaceString,
  isWorkspaceCreating,
  WorkspaceId
} from '@hcengineering/core'
import { Person } from '@hcengineering/contact'
import { Db, Collection } from 'mongodb'

import { WorkspaceClient } from './workspaceClient'
import config from './config'
import { getWorkspaceInfo } from './account'
import { SupportWsClient } from './supportWsClient'
import { Action, OnboardingMessage } from './types'

const closeWorkspaceTimeout = 10 * 60 * 1000 // 10 minutes

export class Collector {
  private readonly workspaces: Map<string, WorkspaceClient> = new Map<string, WorkspaceClient>()
  private readonly closeWorkspaceTimeouts: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>()
  private readonly createdWorkspaces: Set<string> = new Set<string>()

  private readonly onboardingMessagesCollection: Collection<OnboardingMessage>

  supportClient: SupportWsClient | undefined = undefined

  persons = new Map<string, Person>()

  constructor (
    private readonly ctx: MeasureContext,
    private readonly db: Db
  ) {
    this.onboardingMessagesCollection = this.db.collection<OnboardingMessage>('messages')
    this.supportClient = this.getSupportWorkspaceClient()
  }

  getWorkspaceClient (workspaceId: WorkspaceId): WorkspaceClient {
    const workspace = toWorkspaceString(workspaceId)

    let wsClient: WorkspaceClient

    if (!this.workspaces.has(workspace)) {
      this.ctx.info('Creating workspace client', { workspace, allClients: Array.from(this.workspaces.keys()) })
      const client = new WorkspaceClient(this.ctx, workspaceId)
      this.workspaces.set(workspace, client)
      wsClient = client
    } else {
      wsClient = this.workspaces.get(workspace) as WorkspaceClient
    }

    this.setWorkspaceCloseTimeout(workspace)

    return wsClient
  }

  setWorkspaceCloseTimeout (workspace: string): void {
    const timeoutId = this.closeWorkspaceTimeouts.get(workspace)

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }

    const newTimeoutId = setTimeout(() => {
      void this.closeWorkspaceClient(workspace)
    }, closeWorkspaceTimeout)

    this.closeWorkspaceTimeouts.set(workspace, newTimeoutId)
  }

  getSupportWorkspaceClient (): SupportWsClient {
    let client: SupportWsClient

    if (this.supportClient !== undefined) {
      client = this.supportClient
    } else {
      client = new SupportWsClient(this.ctx, getWorkspaceId(config.SupportWorkspace))
      this.supportClient = client
    }

    this.setWorkspaceCloseTimeout(config.SupportWorkspace)

    return client
  }

  async closeWorkspaceClient (workspace: string): Promise<void> {
    this.ctx.info('Closing workspace client', { workspace })
    const timeoutId = this.closeWorkspaceTimeouts.get(workspace)

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      this.closeWorkspaceTimeouts.delete(workspace)
    }

    if (workspace === config.SupportWorkspace) {
      await this.supportClient?.close()
      this.supportClient = undefined
    } else {
      const client = this.workspaces.get(workspace)

      if (client !== undefined) {
        await client.close()
        this.workspaces.delete(workspace)
      }
    }
  }

  collect (events: AnalyticEvent[], token: Token): void {
    if (toWorkspaceString(token.workspace) === config.SupportWorkspace) {
      return
    }

    void this.pushEventsToSupport(events, token)
  }

  async isWorkspaceCreated (token: Token): Promise<boolean> {
    const ws = toWorkspaceString(token.workspace)

    if (this.createdWorkspaces.has(ws)) {
      return true
    }

    const info = await getWorkspaceInfo(generateToken(token.email, token.workspace, token.extra))
    this.ctx.info('workspace info', info)

    if (info === undefined) {
      return false
    }

    if (isWorkspaceCreating(info?.mode)) {
      return false
    }

    this.createdWorkspaces.add(ws)
    return true
  }

  async getPerson (email: string, workspace: WorkspaceId): Promise<Person | undefined> {
    const wsString = toWorkspaceString(workspace)
    const key = `${email}-${wsString}`

    if (this.persons.has(key)) {
      return this.persons.get(key)
    }

    const fromWsClient = this.getWorkspaceClient(workspace)
    const account = await fromWsClient.getAccount(email)

    if (account === undefined) {
      this.ctx.error('Cannnot found account', { email, workspace: wsString })
      return
    }

    if (account.role !== AccountRole.Owner) {
      return
    }

    const person = await fromWsClient.getPerson(account)

    if (person !== undefined) {
      this.persons.set(key, person)
    }

    return person
  }

  async pushEventsToSupport (events: AnalyticEvent[], token: Token): Promise<void> {
    const isCreated = await this.isWorkspaceCreated(token)

    if (!isCreated) {
      return
    }

    const person = await this.getPerson(token.email, token.workspace)

    if (person === undefined) {
      return
    }

    const client = this.getSupportWorkspaceClient()

    await client.pushEvents(events, token.email, token.workspace, person, this.onboardingMessagesCollection)
  }

  async processAction (action: Action, token: Token): Promise<void> {
    const ws = toWorkspaceString(token.workspace)

    if (ws !== config.SupportWorkspace) {
      return
    }

    const client = this.getSupportWorkspaceClient()

    await client.processAction(action, token.email, this.onboardingMessagesCollection)
  }

  async close (): Promise<void> {
    for (const [, client] of this.workspaces) {
      await client.close()
    }

    this.workspaces.clear()
    this.closeWorkspaceTimeouts.clear()

    if (this.supportClient !== undefined) {
      await this.supportClient.close()
      this.supportClient = undefined
    }
  }
}
