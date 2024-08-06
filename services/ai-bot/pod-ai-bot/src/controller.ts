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
import { getWorkspaceId, MeasureContext, toWorkspaceString, WorkspaceId } from '@hcengineering/core'
import { aiBotAccountEmail, AIBotTransferEvent } from '@hcengineering/ai-bot'
import { WorkspaceInfoRecord } from '@hcengineering/server-ai-bot'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'

import { WorkspaceClient } from './workspaceClient'

const POLLING_INTERVAL_MS = 5 * 1000 // 5 seconds
const CLOSE_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

export class AIBotController {
  private readonly workspaces: Map<string, WorkspaceClient> = new Map<string, WorkspaceClient>()
  private readonly closeWorkspaceTimeouts: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>()

  private readonly db: Db
  private readonly ctx: MeasureContext
  private readonly workspacesInfoCollection: Collection<WorkspaceInfoRecord>

  private readonly intervalId: NodeJS.Timeout

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

      if (this.workspaces.has(toWorkspaceString(id))) {
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
  }

  async initWorkspaceClient (workspaceId: WorkspaceId, info: WorkspaceInfoRecord): Promise<void> {
    const workspace = toWorkspaceString(workspaceId)

    if (!this.workspaces.has(workspace)) {
      this.ctx.info('Listen workspace: ', { workspace })
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
