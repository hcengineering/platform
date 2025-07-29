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

import { isWorkspaceLoginInfo } from '@hcengineering/account-client'
import {
  AIEventRequest,
  ConnectMeetingRequest,
  DisconnectMeetingRequest,
  IdentityResponse,
  PersonMessage,
  PostTranscriptRequest,
  SummarizeMessagesRequest,
  SummarizeMessagesResponse,
  TranslateRequest,
  TranslateResponse
} from '@hcengineering/ai-bot'
import core, {
  AccountUuid,
  MeasureContext,
  PersonId,
  Ref,
  SocialId,
  SortingOrder,
  toIdMap,
  type WorkspaceIds,
  type WorkspaceUuid
} from '@hcengineering/core'
import { Room } from '@hcengineering/love'
import { WorkspaceInfoRecord } from '@hcengineering/server-ai-bot'
import { getAccountClient } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { htmlToMarkup, jsonToHTML, jsonToMarkup, markupToJSON } from '@hcengineering/text'
import { encodingForModel, getEncoding } from 'js-tiktoken'
import OpenAI from 'openai'

import chunter from '@hcengineering/chunter'
import { StorageAdapter } from '@hcengineering/server-core'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { markdownToMarkup, markupToMarkdown } from '@hcengineering/text-markdown'
import config from './config'
import { DbStorage } from './storage'
import { tryAssignToWorkspace } from './utils/account'
import { summarizeMessages, translateHtml } from './utils/openai'
import { WorkspaceClient } from './workspace/workspaceClient'
import contact, { Contact, getName, SocialIdentityRef } from '@hcengineering/contact'

const CLOSE_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

export class AIControl {
  private readonly workspaces: Map<WorkspaceUuid, WorkspaceClient> = new Map<WorkspaceUuid, WorkspaceClient>()
  private readonly closeWorkspaceTimeouts: Map<WorkspaceUuid, NodeJS.Timeout> = new Map<WorkspaceUuid, NodeJS.Timeout>()
  private readonly connectingWorkspaces = new Map<WorkspaceUuid, Promise<void>>()

  readonly storageAdapter: StorageAdapter

  private readonly openai?: OpenAI

  // Try to obtain the encoding for the configured model. If the model is not recognised by js-tiktoken
  // (e.g. non-OpenAI models such as Together AI Llama derivatives) we gracefully fall back to the
  // universal `cl100k_base` encoding. This prevents a runtime "Unknown model" error while still
  // giving us a reasonable token count estimate for summaries.
  private readonly openaiEncoding = (() => {
    try {
      return encodingForModel(config.OpenAIModel)
    } catch (err) {
      return getEncoding('cl100k_base')
    }
  })()

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
      this.ctx.newChild('create-workspace', {}, { span: false }),
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
    const html = jsonToHTML(markupToJSON(req.text))
    const result = await translateHtml(this.openai, html, req.lang)
    const text = result !== undefined ? htmlToMarkup(result) : req.text
    return {
      text,
      lang: req.lang
    }
  }

  async summarizeMessages (
    workspace: WorkspaceUuid,
    req: SummarizeMessagesRequest
  ): Promise<SummarizeMessagesResponse | undefined> {
    if (this.openai === undefined) return
    if (req.target === undefined || req.targetClass === undefined) return

    const wsClient = await this.getWorkspaceClient(workspace)
    if (wsClient === undefined) return

    const opClient = await wsClient.opClient
    if (opClient === undefined) return

    const client = wsClient.client
    if (client === undefined) return

    const target = await client.findOne(req.targetClass, { _id: req.target })
    if (target === undefined) return

    const messages = await client.findAll(
      chunter.class.ChatMessage,
      {
        attachedTo: target._id,
        collection: { $in: ['messages', 'transcription'] }
      },
      {
        sort: { createdOn: SortingOrder.Ascending },
        limit: 5000
      }
    )

    const personIds = new Set<PersonId>()
    for (const m of messages) {
      if (m.createdBy !== undefined) personIds.add(m.createdBy)
    }
    const identities = await client.findAll(contact.class.SocialIdentity, {
      _id: { $in: Array.from(personIds) as SocialIdentityRef[] }
    })
    const contacts = await client.findAll(contact.class.Contact, { _id: { $in: identities.map((i) => i.attachedTo) } })
    const contactById = toIdMap(contacts)
    const contactByPersonId = new Map<PersonId, Contact>()
    for (const identity of identities) {
      const contact = contactById.get(identity.attachedTo)
      if (contact !== undefined) contactByPersonId.set(identity._id, contact)
    }

    const messagesToSummarize: PersonMessage[] = []

    for (const m of messages) {
      const author = m.createdBy
      if (author === undefined) continue

      const contact = contactByPersonId.get(author)
      if (contact === undefined) continue

      const personName = getName(client.getHierarchy(), contact)
      const text = markupToMarkdown(markupToJSON(m.message))

      const lastPiece = messagesToSummarize[messagesToSummarize.length - 1]
      if (lastPiece?.personRef === contact._id) {
        lastPiece.text += (m.collection === 'transcription' ? ' ' : '\n') + text
      } else {
        messagesToSummarize.push({
          personRef: contact._id,
          personName,
          time: m.createdOn ?? 0,
          text
        })
      }
    }

    const summary = await summarizeMessages(this.openai, messagesToSummarize, req.lang)
    if (summary === undefined) return

    const summaryMarkup = jsonToMarkup(markdownToMarkup(summary))

    const lastMessage = await client.findOne(
      chunter.class.ChatMessage,
      {
        attachedTo: target._id,
        collection: { $in: ['messages', 'transcription', 'summary'] }
      },
      {
        sort: { createdOn: SortingOrder.Descending },
        limit: 1
      }
    )

    const op = opClient.apply(undefined, 'AISummarizeMessagesRequestEvent')

    if (lastMessage?.collection === 'summary' && lastMessage.createdBy === opClient.user) {
      await op.update(lastMessage, { message: summaryMarkup, editedOn: Date.now() })
    } else {
      await op.addCollection(chunter.class.ChatMessage, core.space.Workspace, target._id, target._class, 'summary', {
        message: summaryMarkup
      })
    }
    await op.commit()

    return {
      text: summaryMarkup,
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
