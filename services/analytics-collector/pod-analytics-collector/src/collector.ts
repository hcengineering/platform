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
import { AccountRole, MeasureContext, isWorkspaceCreating, WorkspaceUuid, PersonUuid } from '@hcengineering/core'
import { Person } from '@hcengineering/contact'
import { getClient as getAccountClient, WorkspaceLoginInfo } from '@hcengineering/account-client'
import { Db, Collection } from 'mongodb'

import { WorkspaceClient } from './workspaceClient'
import config from './config'
import { SupportWsClient } from './supportWsClient'
import { Action, OnboardingMessage } from './types'

const closeWorkspaceTimeout = 10 * 60 * 1000 // 10 minutes

export class Collector {
  private readonly workspaces: Map<WorkspaceUuid, WorkspaceClient> = new Map<WorkspaceUuid, WorkspaceClient>()
  private readonly closeWorkspaceTimeouts: Map<WorkspaceUuid, NodeJS.Timeout> = new Map<WorkspaceUuid, NodeJS.Timeout>()
  private readonly createdWorkspaces: Set<WorkspaceUuid> = new Set<WorkspaceUuid>()

  private readonly onboardingMessagesCollection: Collection<OnboardingMessage>

  supportClient: SupportWsClient | undefined = undefined

  // <account-workspace key, Person>
  persons = new Map<string, Person>()

  constructor (
    private readonly ctx: MeasureContext,
    private readonly db: Db
  ) {
    this.onboardingMessagesCollection = this.db.collection<OnboardingMessage>('messages')
    this.supportClient = this.getSupportWorkspaceClient()
  }

  getWorkspaceClient (workspaceId: WorkspaceUuid): WorkspaceClient {
    const workspace = workspaceId

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

  setWorkspaceCloseTimeout (workspace: WorkspaceUuid): void {
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
    // TODO: FIXME
    throw new Error('Not implemented')
    // let client: SupportWsClient

    // if (this.supportClient !== undefined) {
    //   client = this.supportClient
    // } else {
    //   client = new SupportWsClient(this.ctx, config.SupportWorkspace)
    //   this.supportClient = client
    // }

    // this.setWorkspaceCloseTimeout(config.SupportWorkspace)

    // return client
  }

  async closeWorkspaceClient (workspace: WorkspaceUuid): Promise<void> {
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
    if (token.workspace === config.SupportWorkspace) {
      return
    }

    void this.pushEventsToSupport(events, token)
  }

  async isWorkspaceCreated (token: Token): Promise<boolean> {
    const ws = token.workspace

    if (this.createdWorkspaces.has(ws)) {
      return true
    }

    const rawToken = generateToken(token.account, token.workspace, token.extra)
    const wsInfo = await getAccountClient(config.AccountsUrl, rawToken).getWorkspaceInfo()
    this.ctx.info('workspace info', wsInfo)

    if (wsInfo === undefined) {
      return false
    }

    if (isWorkspaceCreating(wsInfo?.mode)) {
      return false
    }

    this.createdWorkspaces.add(ws)
    return true
  }

  async getPerson (account: PersonUuid, workspace: WorkspaceUuid): Promise<Person | undefined> {
    const key = `${account}-${workspace}`

    if (this.persons.has(key)) {
      return this.persons.get(key)
    }

    const token = generateToken(account, workspace, { service: 'analytics-collector' })
    const wsLoginInfo = await getAccountClient(config.AccountsUrl, token).getLoginInfoByToken()

    if ((wsLoginInfo as WorkspaceLoginInfo).role !== AccountRole.Owner) {
      return
    }

    const fromWsClient = this.getWorkspaceClient(workspace)
    const person = await fromWsClient.getPerson(account)

    if (person === undefined) {
      this.ctx.error('Cannnot find person', { account, workspace })
      return
    }

    this.persons.set(key, person)

    return person
  }

  async pushEventsToSupport (events: AnalyticEvent[], token: Token): Promise<void> {
    const isCreated = await this.isWorkspaceCreated(token)

    if (!isCreated) {
      return
    }

    const person = await this.getPerson(token.account, token.workspace)

    if (person === undefined) {
      return
    }

    const client = this.getSupportWorkspaceClient()

    await client.pushEvents(events, token.workspace, person, this.onboardingMessagesCollection)
  }

  async processAction (action: Action, token: Token): Promise<void> {
    const ws = token.workspace

    if (ws !== config.SupportWorkspace) {
      return
    }

    const person = await this.getPerson(token.account, token.workspace)

    if (person === undefined) {
      return
    }

    const client = this.getSupportWorkspaceClient()

    await client.processAction(action, person, this.onboardingMessagesCollection)
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
