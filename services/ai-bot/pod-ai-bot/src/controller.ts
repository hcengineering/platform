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

import {
  AIEventRequest,
  ConnectMeetingRequest,
  DisconnectMeetingRequest,
  IdentityResponse,
  PostTranscriptRequest,
  TranslateRequest,
  TranslateResponse
} from '@hcengineering/ai-bot'
import { AccountUuid, MeasureContext, Ref, SocialId, type WorkspaceIds, type WorkspaceUuid } from '@hcengineering/core'
import { Room } from '@hcengineering/love'
import { WorkspaceInfoRecord } from '@hcengineering/server-ai-bot'
import { getAccountClient } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { htmlToMarkup, markupToHTML } from '@hcengineering/text'
import { isWorkspaceLoginInfo } from '@hcengineering/account-client'
import { encodingForModel } from 'js-tiktoken'
import OpenAI from 'openai'

import { StorageAdapter } from '@hcengineering/server-core'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import config from './config'
import { DbStorage } from './storage'
import { WorkspaceClient } from './workspace/workspaceClient'
import { translateHtml } from './utils/openai'
import { tryAssignToWorkspace } from './utils/account'

const CLOSE_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

export class AIControl {
  private readonly workspaces: Map<WorkspaceUuid, WorkspaceClient> = new Map<WorkspaceUuid, WorkspaceClient>()
  private readonly closeWorkspaceTimeouts: Map<WorkspaceUuid, NodeJS.Timeout> = new Map<WorkspaceUuid, NodeJS.Timeout>()
  private readonly connectingWorkspaces = new Map<WorkspaceUuid, Promise<void>>()

  readonly storageAdapter: StorageAdapter

  private readonly openai?: OpenAI
  private readonly openaiEncoding = encodingForModel(config.OpenAIModel)

  constructor (
    readonly personUuid: AccountUuid,
    readonly socialIds: SocialId[],
    private readonly storage: DbStorage,
    private readonly ctx: MeasureContext
  ) {
    this.openai =
      config.OpenAIKey !== ''
        ? new OpenAI({
          apiKey: config.OpenAIKey,
          baseURL: config.OpenAIBaseUrl === '' ? undefined : config.OpenAIBaseUrl
        })
        : undefined
    this.storageAdapter = buildStorageFromConfig(storageConfigFromEnv())
  }

  async getWorkspaceRecord (workspace: string): Promise<WorkspaceInfoRecord | undefined> {
    return await this.storage.getWorkspace(workspace)
  }

  async closeWorkspaceClient (workspace: WorkspaceUuid): Promise<void> {
    const timeoutId = this.closeWorkspaceTimeouts.get(workspace)

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      this.closeWorkspaceTimeouts.delete(workspace)
    }

    const client = this.workspaces.get(workspace)

    if (client !== undefined) {
      if (client.canClose()) {
        await client.close()
        this.workspaces.delete(workspace)
      } else {
        this.updateClearInterval(workspace)
      }
    }
    this.connectingWorkspaces.delete(workspace)
  }

  updateClearInterval (workspace: WorkspaceUuid): void {
    const newTimeoutId = setTimeout(() => {
      void this.closeWorkspaceClient(workspace)
    }, CLOSE_INTERVAL_MS)

    this.closeWorkspaceTimeouts.set(workspace, newTimeoutId)
  }

  async createWorkspaceClient (
    workspace: WorkspaceUuid,
    info: WorkspaceInfoRecord
  ): Promise<WorkspaceClient | undefined> {
    const isAssigned = await tryAssignToWorkspace(workspace, this.ctx)

    if (!isAssigned) {
      this.ctx.error('Cannot assign to workspace', { workspace })
      return
    }

    const token = generateToken(this.personUuid, workspace, { service: 'aibot' })
    const wsLoginInfo = await getAccountClient(token).getLoginInfoByToken()

    if (!isWorkspaceLoginInfo(wsLoginInfo)) {
      this.ctx.error('Invalid workspace login info', { workspace, wsLoginInfo })
      return
    }

    const wsIds: WorkspaceIds = {
      uuid: wsLoginInfo.workspace,
      url: wsLoginInfo.workspaceUrl,
      dataId: wsLoginInfo.workspaceDataId
    }

    this.ctx.info('Listen workspace: ', { workspace })

    return new WorkspaceClient(
      this.storageAdapter,
      this.storage,
      wsLoginInfo.endpoint,
      token,
      wsIds,
      this.personUuid,
      this.socialIds,
      this.ctx.newChild(workspace, {}),
      this.openai,
      this.openaiEncoding,
      info
    )
  }

  async initWorkspaceClient (workspace: WorkspaceUuid): Promise<void> {
    if (this.connectingWorkspaces.has(workspace)) {
      return await this.connectingWorkspaces.get(workspace)
    }

    const initPromise = (async () => {
      try {
        if (!this.workspaces.has(workspace)) {
          const record = (await this.getWorkspaceRecord(workspace)) ?? { workspace }
          const client = await this.createWorkspaceClient(workspace, record)
          if (client === undefined) {
            return
          }
          this.workspaces.set(workspace, client)
        }

        const timeoutId = this.closeWorkspaceTimeouts.get(workspace)
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId)
        }

        this.updateClearInterval(workspace)
      } finally {
        this.connectingWorkspaces.delete(workspace)
      }
    })()

    this.connectingWorkspaces.set(workspace, initPromise)

    await initPromise
  }

  async close (): Promise<void> {
    for (const workspace of this.workspaces.values()) {
      await workspace.close()
    }
    for (const timeoutId of this.closeWorkspaceTimeouts.values()) {
      clearTimeout(timeoutId)
    }
    this.workspaces.clear()
  }

  async getWorkspaceClient (workspace: WorkspaceUuid): Promise<WorkspaceClient | undefined> {
    await this.initWorkspaceClient(workspace)

    return this.workspaces.get(workspace)
  }

  async translate (req: TranslateRequest): Promise<TranslateResponse | undefined> {
    if (this.openai === undefined) {
      return undefined
    }
    const html = markupToHTML(req.text)
    const result = await translateHtml(this.openai, html, req.lang)
    const text = result !== undefined ? htmlToMarkup(result) : req.text
    return {
      text,
      lang: req.lang
    }
  }

  async processEvent (workspace: WorkspaceUuid, events: AIEventRequest[]): Promise<void> {
    if (this.openai === undefined) return

    for (const event of events) {
      const wsClient = await this.getWorkspaceClient(workspace)
      if (wsClient === undefined) continue
      await wsClient.processMessageEvent(event)
    }
  }

  async connect (workspace: WorkspaceUuid): Promise<void> {
    await this.initWorkspaceClient(workspace)
  }

  async loveConnect (workspace: WorkspaceUuid, request: ConnectMeetingRequest): Promise<void> {
    const wsClient = await this.getWorkspaceClient(workspace)
    if (wsClient === undefined) return

    await wsClient.loveConnect(request)
  }

  async loveDisconnect (workspace: WorkspaceUuid, request: DisconnectMeetingRequest): Promise<void> {
    const wsClient = await this.getWorkspaceClient(workspace)
    if (wsClient === undefined) return

    await wsClient.loveDisconnect(request)
  }

  async getLoveIdentity (roomName: string): Promise<IdentityResponse | undefined> {
    const parsed = roomName.split('_')
    const workspace = parsed[0] as WorkspaceUuid

    if (workspace === null) return

    const wsClient = await this.getWorkspaceClient(workspace)
    if (wsClient === undefined) {
      this.ctx.error('Workspace not found', { workspace })
      return
    }

    return await wsClient.getLoveIdentity()
  }

  async processLoveTranscript (request: PostTranscriptRequest): Promise<void> {
    const parsed = request.roomName.split('_')
    const workspace = parsed[0] as WorkspaceUuid | undefined
    const roomId = parsed[parsed.length - 1] as Ref<Room> | undefined

    if (workspace == null || roomId == null) return

    const wsClient = await this.getWorkspaceClient(workspace)
    if (wsClient === undefined) return

    await wsClient.processLoveTranscript(request.transcript, request.participant, roomId)
  }
}
