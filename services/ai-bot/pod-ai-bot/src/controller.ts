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

import { Db, Collection } from 'mongodb'
import { getWorkspaceId, MeasureContext, systemAccountEmail, toWorkspaceString, WorkspaceId } from '@hcengineering/core'
import { aiBotAccountEmail, AIBotTransferEvent } from '@hcengineering/ai-bot'
import { WorkspaceInfoRecord } from '@hcengineering/server-ai-bot'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { WorkspaceLoginInfo } from '@hcengineering/account'

import { WorkspaceClient } from './workspaceClient'
import { assignBotToWorkspace, getWorkspaceInfo } from './account'

const POLLING_INTERVAL_MS = 5 * 1000 // 5 seconds
const CLOSE_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
const ASSIGN_WORKSPACE_DELAY_MS = 5 * 1000 // 5 secs
const MAX_ASSIGN_ATTEMPTS = 5

export class AIBotController {
  private readonly workspaces: Map<string, WorkspaceClient> = new Map<string, WorkspaceClient>()
  private readonly closeWorkspaceTimeouts: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>()
  private readonly connectingWorkspaces: Set<string> = new Set<string>()

  private readonly db: Db
  private readonly ctx: MeasureContext
  private readonly workspacesInfoCollection: Collection<WorkspaceInfoRecord>

  private readonly intervalId: NodeJS.Timeout

  assignTimeout: NodeJS.Timeout | undefined
  assignAttempts = 0

  constructor (mongoDb: Db, ctx: MeasureContext) {
    this.db = mongoDb
    this.ctx = ctx
    this.workspacesInfoCollection = this.db.collection<WorkspaceInfoRecord>('workspacesInfo')

    this.intervalId = setInterval(() => {
      void this.updateWorkspaceClients()
    }, POLLING_INTERVAL_MS)
  }

  async updateWorkspaceClients (): Promise<void> {
    const activeRecords = await this.workspacesInfoCollection.find({ active: true }).toArray()

    for (const record of activeRecords) {
      const id: WorkspaceId = { name: record.workspace, productId: record.productId }

      const ws = toWorkspaceString(id)

      if (this.workspaces.has(ws)) {
        continue
      }

      if (this.connectingWorkspaces.has(ws)) {
        continue
      }

      await this.initWorkspaceClient(id, record)
    }
  }

  async closeWorkspaceClient (workspaceId: WorkspaceId): Promise<void> {
    const workspace = toWorkspaceString(workspaceId)

    this.ctx.info('Closing workspace client: ', { workspace })

    const timeoutId = this.closeWorkspaceTimeouts.get(workspace)

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      this.closeWorkspaceTimeouts.delete(workspace)
    }

    await this.workspacesInfoCollection.updateOne(
      { workspace: workspaceId.name, productId: workspaceId.productId },
      { $set: { active: false } }
    )

    const client = this.workspaces.get(workspace)

    if (client !== undefined) {
      await client.close()
      this.workspaces.delete(workspace)
    }
    this.connectingWorkspaces.delete(workspace)
  }

  private async getWorkspaceInfo (ws: WorkspaceId): Promise<WorkspaceLoginInfo | undefined> {
    const systemToken = generateToken(systemAccountEmail, ws)
    for (let i = 0; i < 5; i++) {
      try {
        const info = await getWorkspaceInfo(systemToken)

        if (info == null) {
          this.ctx.warn('Cannot find workspace info', ws)
          await wait(ASSIGN_WORKSPACE_DELAY_MS)
          continue
        }

        return info
      } catch (e) {
        this.ctx.error('Error during get workspace info:', { e })
        await wait(ASSIGN_WORKSPACE_DELAY_MS)
      }
    }
  }

  private async assignToWorkspace (ws: WorkspaceId): Promise<void> {
    clearTimeout(this.assignTimeout)
    try {
      const info = await this.getWorkspaceInfo(ws)

      if (info === undefined) {
        void this.closeWorkspaceClient(ws)
        return
      }

      if (info.creating === true) {
        this.ctx.info('Workspace is creating -> waiting...', ws)
        this.assignTimeout = setTimeout(() => {
          void this.assignToWorkspace(ws)
        }, ASSIGN_WORKSPACE_DELAY_MS)
        return
      }

      const result = await assignBotToWorkspace(ws)
      this.ctx.info('Assign to workspace result: ', { result, workspace: ws.name })
    } catch (e) {
      this.ctx.error('Error during assign workspace:', { e })
      if (this.assignAttempts < MAX_ASSIGN_ATTEMPTS) {
        this.assignAttempts++
        this.assignTimeout = setTimeout(() => {
          void this.assignToWorkspace(ws)
        }, ASSIGN_WORKSPACE_DELAY_MS)
      } else {
        void this.closeWorkspaceClient(ws)
      }
    }
  }

  async initWorkspaceClient (workspaceId: WorkspaceId, info: WorkspaceInfoRecord): Promise<void> {
    const workspace = toWorkspaceString(workspaceId)
    this.connectingWorkspaces.add(workspace)

    if (!this.workspaces.has(workspace)) {
      this.ctx.info('Listen workspace: ', { workspace })
      await this.assignToWorkspace(workspaceId)
      const token = generateToken(aiBotAccountEmail, workspaceId)
      const endpoint = await getTransactorEndpoint(token)
      this.workspaces.set(
        workspace,
        new WorkspaceClient(endpoint, token, workspaceId, this, this.ctx.newChild(workspace, {}), info)
      )
    }

    const timeoutId = this.closeWorkspaceTimeouts.get(workspace)

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }

    const newTimeoutId = setTimeout(() => {
      void this.closeWorkspaceClient(workspaceId)
    }, CLOSE_INTERVAL_MS)

    this.closeWorkspaceTimeouts.set(workspace, newTimeoutId)
    this.connectingWorkspaces.delete(workspace)
  }

  async transfer (event: AIBotTransferEvent): Promise<void> {
    const workspaceId = getWorkspaceId(event.toWorkspace)
    const info = await this.workspacesInfoCollection
      .find({ workspace: workspaceId.name, productId: workspaceId.productId })
      .toArray()

    await this.initWorkspaceClient(workspaceId, info[0])

    const wsClient = this.workspaces.get(event.toWorkspace)

    if (wsClient === undefined) {
      return
    }

    await wsClient.transfer(event)
  }

  async close (): Promise<void> {
    clearInterval(this.intervalId)
    for (const workspace of this.workspaces.values()) {
      await workspace.close()
    }
    for (const timeoutId of this.closeWorkspaceTimeouts.values()) {
      clearTimeout(timeoutId)
    }
    this.workspaces.clear()
  }

  async updateAvatarInfo (workspace: WorkspaceId, path: string, lastModified: number): Promise<void> {
    await this.workspacesInfoCollection.updateOne(
      { workspace: workspace.name, productId: workspace.productId },
      { $set: { avatarPath: path, avatarLastModified: lastModified } }
    )
  }
}

async function wait (delay: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve()
    }, delay)
  })
}
