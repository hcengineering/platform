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
  aiBotAccount,
  AIEventRequest,
  AIEventType,
  AIMessageEventRequest,
  AITransferEventRequest,
  ConnectMeetingRequest,
  DisconnectMeetingRequest,
  IdentityResponse,
  OnboardingEvent,
  OnboardingEventRequest,
  OpenChatInSidebarData,
  PostTranscriptRequest,
  TranslateRequest,
  TranslateResponse
} from '@hcengineering/ai-bot'
import { WorkspaceInfoRecord } from '@hcengineering/server-ai-bot'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import OpenAI from 'openai'
import { encodingForModel } from 'js-tiktoken'
import { htmlToMarkup, markupToHTML } from '@hcengineering/text'
import { Markup, MeasureContext, Ref, WorkspaceUuid } from '@hcengineering/core'
import { Room } from '@hcengineering/love'

import { WorkspaceClient } from './workspace/workspaceClient'
import config from './config'
import { DbStorage } from './storage'
import { SupportWsClient } from './workspace/supportWsClient'
import { AIReplyTransferData } from './types'
import { tryAssignToWorkspace } from './utils/account'
import { translateHtml } from './utils/openai'

const CLOSE_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

export class AIControl {
  private readonly workspaces: Map<WorkspaceUuid, WorkspaceClient> = new Map<WorkspaceUuid, WorkspaceClient>()
  private readonly closeWorkspaceTimeouts: Map<WorkspaceUuid, NodeJS.Timeout> = new Map<WorkspaceUuid, NodeJS.Timeout>()
  private readonly connectingWorkspaces: Set<WorkspaceUuid> = new Set<WorkspaceUuid>()

  readonly aiClient?: OpenAI
  readonly encoding = encodingForModel(config.OpenAIModel)

  supportClient: SupportWsClient | undefined = undefined

  constructor (
    readonly storage: DbStorage,
    private readonly ctx: MeasureContext
  ) {
    this.aiClient =
      config.OpenAIKey !== ''
        ? new OpenAI({
          apiKey: config.OpenAIKey,
          baseURL: config.OpenAIBaseUrl === '' ? undefined : config.OpenAIBaseUrl
        })
        : undefined

    void this.connectSupportWorkspace()
  }

  async getWorkspaceRecord (workspace: string): Promise<WorkspaceInfoRecord> {
    return (await this.storage.getWorkspace(workspace)) ?? { workspace: config.SupportWorkspace }
  }

  async connectSupportWorkspace (): Promise<void> {
    if (this.supportClient === undefined && !this.connectingWorkspaces.has(config.SupportWorkspace)) {
      this.connectingWorkspaces.add(config.SupportWorkspace)
      const record = await this.getWorkspaceRecord(config.SupportWorkspace)
      this.supportClient = (await this.createWorkspaceClient(config.SupportWorkspace, record)) as SupportWsClient
      this.connectingWorkspaces.delete(config.SupportWorkspace)
    }
  }

  async closeWorkspaceClient (workspace: string): Promise<void> {
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

  updateClearInterval (workspace: string): void {
    const newTimeoutId = setTimeout(() => {
      void this.closeWorkspaceClient(workspace)
    }, CLOSE_INTERVAL_MS)

    this.closeWorkspaceTimeouts.set(workspace, newTimeoutId)
  }

  async createWorkspaceClient (workspace: WorkspaceUuid, info: WorkspaceInfoRecord): Promise<WorkspaceClient | undefined> {
    const isAssigned = await tryAssignToWorkspace(workspace, this.ctx)

    if (!isAssigned) {
      return
    }

    const token = generateToken(aiBotAccount, workspace, { service: 'aibot' })
    const endpoint = await getTransactorEndpoint(token)

    this.ctx.info('Listen workspace: ', { workspace })

    if (workspace === config.SupportWorkspace) {
      return new SupportWsClient(endpoint, token, workspace, this, this.ctx.newChild(workspace, {}), info)
    }

    return new WorkspaceClient(endpoint, token, workspace, this, this.ctx.newChild(workspace, {}), info)
  }

  async initWorkspaceClient (workspace: WorkspaceUuid): Promise<void> {
    if (workspace === config.SupportWorkspace) {
      return
    }
    this.connectingWorkspaces.add(workspace)

    if (!this.workspaces.has(workspace)) {
      const record = await this.getWorkspaceRecord(workspace)
      const client = await this.createWorkspaceClient(workspace, record)
      if (client === undefined) {
        this.connectingWorkspaces.delete(workspace)
        return
      }

      this.workspaces.set(workspace, client)
    }

    const timeoutId = this.closeWorkspaceTimeouts.get(workspace)

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }

    this.updateClearInterval(workspace)
    this.connectingWorkspaces.delete(workspace)
  }

  allowAiReplies (workspace: string, email: string): boolean {
    if (this.supportClient === undefined) return true

    return this.supportClient.allowAiReplies(workspace, email)
  }

  async transferAIReplyToSupport (response: Markup, data: AIReplyTransferData): Promise<void> {
    if (this.supportClient === undefined) return

    await this.supportClient.transferAIReply(response, data)
  }

  async transfer (event: AITransferEventRequest): Promise<void> {
    const workspace = event.toWorkspace

    if (workspace === config.SupportWorkspace) {
      if (this.supportClient === undefined) return

      await this.supportClient.transfer(event)
      return
    }

    const wsClient = await this.getWorkspaceClient(workspace)
    if (wsClient === undefined) return

    await wsClient.transfer(event)
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

  async updateAvatarInfo (workspace: string, path: string, lastModified: number): Promise<void> {
    const record = await this.storage.getWorkspace(workspace)

    if (record === undefined) {
      await this.storage.addWorkspace({ workspace, avatarPath: path, avatarLastModified: lastModified })
    } else {
      await this.storage.updateWorkspace(workspace, { $set: { avatarPath: path, avatarLastModified: lastModified } })
    }
  }

  async getWorkspaceClient (workspace: WorkspaceUuid): Promise<WorkspaceClient | undefined> {
    await this.initWorkspaceClient(workspace)

    return this.workspaces.get(workspace)
  }

  async openChatInSidebar (data: OpenChatInSidebarData): Promise<void> {
    const wsClient = await this.getWorkspaceClient(data.workspace)
    if (wsClient === undefined) return
    await wsClient.openAIChatInSidebar(data.personId)
  }

  async processOnboardingEvent (event: OnboardingEventRequest): Promise<void> {
    switch (event.event) {
      case OnboardingEvent.OpenChatInSidebar:
        await this.openChatInSidebar(event.data as OpenChatInSidebarData)
        break
    }
  }

  async translate (req: TranslateRequest): Promise<TranslateResponse | undefined> {
    if (this.aiClient === undefined) {
      return undefined
    }
    const html = markupToHTML(req.text)
    const result = await translateHtml(this.aiClient, html, req.lang)
    const text = result !== undefined ? htmlToMarkup(result) : req.text
    return {
      text,
      lang: req.lang
    }
  }

  async processMessageEvent (workspace: string, event: AIMessageEventRequest): Promise<void> {
    const wsClient = await this.getWorkspaceClient(workspace)
    if (wsClient === undefined) return

    await wsClient.processMessageEvent(event)
  }

  async processEvent (workspace: string, events: AIEventRequest[]): Promise<void> {
    for (const event of events) {
      switch (event.type) {
        case AIEventType.Transfer:
          await this.transfer(event as AITransferEventRequest)
          break
        case AIEventType.Message:
          await this.processMessageEvent(workspace, event as AIMessageEventRequest)
          break
        default:
          this.ctx.warn('unknown event', event)
          break
      }
    }
  }

  async connect (workspace: string): Promise<void> {
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
    const workspace = parsed[0]

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
    const workspace = parsed[0]
    const roomId = parsed[parsed.length - 1]

    if (workspace === null || roomId === null) return

    const wsClient = await this.getWorkspaceClient(workspace)
    if (wsClient === undefined) return

    await wsClient.processLoveTranscript(request.transcript, request.participant, roomId as Ref<Room>)
  }
}
