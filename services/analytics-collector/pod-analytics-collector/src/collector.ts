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
  Timestamp,
  toWorkspaceString,
  WorkspaceId
} from '@hcengineering/core'
import { Person } from '@hcengineering/contact'

import { WorkspaceClient } from './workspaceClient'
import config from './config'
import { getWorkspaceInfo } from './account'

const clearEventsTimeout = 10 * 60 * 1000 // 10 hour
const eventsTimeToLive = 60 * 60 * 1000 // 1 hour
const closeWorkspaceTimeout = 10 * 60 * 1000 // 10 minutes

export class Collector {
  private readonly workspaces: Map<string, WorkspaceClient> = new Map<string, WorkspaceClient>()
  private readonly closeWorkspaceTimeouts: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>()
  private readonly createdWorkspaces: Set<string> = new Set<string>()
  private readonly workspaceUrlById = new Map<string, string>()

  supportClient: WorkspaceClient | undefined = undefined
  eventsByEmail = new Map<string, AnalyticEvent[]>()

  periodicTimer: NodeJS.Timeout

  persons = new Map<string, Person>()

  constructor (private readonly ctx: MeasureContext) {
    this.periodicTimer = setInterval(() => {
      void this.clearEvents()
    }, clearEventsTimeout)
  }

  async clearEvents (): Promise<void> {
    const now = Date.now()

    for (const [key, events] of this.eventsByEmail.entries()) {
      const firstValidIndex = events.findIndex((event) => now - event.timestamp < eventsTimeToLive)

      if (firstValidIndex === -1) {
        this.eventsByEmail.delete(key)
      } else {
        this.eventsByEmail.set(key, events.slice(firstValidIndex))
      }
    }
  }

  async closeWorkspaceClient (workspaceId: WorkspaceId): Promise<void> {
    this.ctx.info('Closing workspace client', { workspace: toWorkspaceString(workspaceId) })
    const workspace = toWorkspaceString(workspaceId)
    const timeoutId = this.closeWorkspaceTimeouts.get(workspace)

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      this.closeWorkspaceTimeouts.delete(workspace)
    }

    const client = this.workspaces.get(workspace)

    if (client !== undefined) {
      await client.close()
      this.workspaces.delete(workspace)
    }
  }

  getWorkspaceClient (workspaceId: WorkspaceId): WorkspaceClient {
    const workspace = toWorkspaceString(workspaceId)
    const wsClient = this.workspaces.get(workspace) ?? new WorkspaceClient(this.ctx, workspaceId)

    if (!this.workspaces.has(workspace)) {
      this.ctx.info('Creating workspace client', { workspace, allClients: Array.from(this.workspaces.keys()) })
      this.workspaces.set(workspace, wsClient)
    }

    const timeoutId = this.closeWorkspaceTimeouts.get(workspace)

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }

    const newTimeoutId = setTimeout(() => {
      void this.closeWorkspaceClient(workspaceId)
    }, closeWorkspaceTimeout)

    this.closeWorkspaceTimeouts.set(workspace, newTimeoutId)

    return wsClient
  }

  collect (events: AnalyticEvent[], token: Token): void {
    if (toWorkspaceString(token.workspace) === config.SupportWorkspace) {
      return
    }

    const existingEvents = this.eventsByEmail.get(token.email) ?? []

    this.eventsByEmail.set(token.email, existingEvents.concat(events))
    void this.pushEvents(events, token)
  }

  getSupportWorkspaceClient (): WorkspaceClient {
    if (this.supportClient === undefined) {
      this.supportClient = new WorkspaceClient(this.ctx, getWorkspaceId(config.SupportWorkspace))
    }

    return this.supportClient
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

    if (info?.workspaceUrl != null) {
      this.workspaceUrlById.set(ws, info.workspaceUrl)
    }

    if (info?.creating === true) {
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

  async pushEvents (events: AnalyticEvent[], token: Token): Promise<void> {
    const isCreated = await this.isWorkspaceCreated(token)

    if (!isCreated) {
      return
    }

    const person = await this.getPerson(token.email, token.workspace)

    if (person === undefined) {
      return
    }

    const client = this.getSupportWorkspaceClient()

    await client.pushEvents(
      events,
      token.email,
      token.workspace,
      person,
      this.workspaceUrlById.get(toWorkspaceString(token.workspace))
    )
  }

  getEvents (start?: Timestamp, end?: Timestamp): AnalyticEvent[] {
    const events = Array.from(this.eventsByEmail.values())
      .flat()
      .sort((e1, e2) => e1.timestamp - e2.timestamp)

    if (start === undefined && end === undefined) {
      return events
    }

    if (start === undefined && end !== undefined) {
      return events.filter((e) => e.timestamp <= end)
    }

    if (end === undefined && start !== undefined) {
      return events.filter((e) => e.timestamp >= start)
    }

    return events.filter((e) => e.timestamp >= (start ?? 0) && e.timestamp <= (end ?? 0))
  }

  async close (): Promise<void> {
    clearInterval(this.periodicTimer)
  }
}
