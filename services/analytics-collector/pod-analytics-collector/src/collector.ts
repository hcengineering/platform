import { generateToken, Token } from '@hcengineering/server-token'
import { AnalyticEvent } from '@hcengineering/analytics-collector'
import { AccountRole, getWorkspaceId, Timestamp, toWorkspaceString, WorkspaceId } from '@hcengineering/core'

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

  supportClient: WorkspaceClient | undefined = undefined
  eventsByEmail = new Map<string, AnalyticEvent[]>()

  periodicTimer: NodeJS.Timeout

  constructor () {
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

  async getWorkspaceClient (workspaceId: WorkspaceId): Promise<WorkspaceClient> {
    const workspace = toWorkspaceString(workspaceId)
    const wsClient = this.workspaces.get(workspace) ?? new WorkspaceClient(workspaceId)

    if (!this.workspaces.has(workspace)) {
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
      this.supportClient = new WorkspaceClient(getWorkspaceId(config.SupportWorkspace))
    }

    return this.supportClient
  }

  async isWorkspaceCreated (token: Token): Promise<boolean> {
    const ws = toWorkspaceString(token.workspace)

    if (this.createdWorkspaces.has(ws)) {
      return true
    }

    console.info('isWorkspaceCreated', token.email, token.workspace.name)
    const info = await getWorkspaceInfo(generateToken(token.email, token.workspace, token.extra))

    console.log('workspace info', info?.workspace, info?.email, info?.endpoint)

    if (info === undefined) {
      return false
    }
    if (info?.creating === true) {
      return false
    }

    this.createdWorkspaces.add(ws)
    return true
  }

  async pushEvents (events: AnalyticEvent[], token: Token): Promise<void> {
    const isCreated = await this.isWorkspaceCreated(token)

    if (!isCreated) {
      return
    }

    const fromWsClient = await this.getWorkspaceClient(token.workspace)
    const account = await fromWsClient.getAccount(token.email)

    if (account === undefined) {
      console.error('Cannnot found account', { email: token.email, workspace: toWorkspaceString(token.workspace) })
      return
    }

    if (account.role !== AccountRole.Owner) {
      return
    }

    const person = await fromWsClient.getPerson(account)
    const client = this.getSupportWorkspaceClient()

    await client.pushEvents(events, token.email, token.workspace, person)
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
