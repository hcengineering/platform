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

import { Readable } from 'stream'
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
import contact, { Person, Contact, getName, SocialIdentityRef } from '@hcengineering/contact'
import chunter, { ChatMessage } from '@hcengineering/chunter'
import { getAccountClient, getTransactorEndpoint } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { htmlToMarkup, jsonToHTML, jsonToMarkup, markupToJSON } from '@hcengineering/text'
import { encodingForModel, getEncoding } from 'js-tiktoken'
import OpenAI from 'openai'

import { ConsumerControl, PlatformQueueProducer, StorageAdapter } from '@hcengineering/server-core'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { TranscriptionTask } from './types'
import { v4 as uuid } from 'uuid'
import { markdownToMarkup, markupToMarkdown } from '@hcengineering/text-markdown'
import config from './config'
import { tryAssignToWorkspace } from './utils/account'
import { summarizeMessages, translateHtml } from './utils/openai'
import { WorkspaceClient } from './workspace/workspaceClient'

const CLOSE_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

/** Audio chunk metadata from HTTP headers */
export interface AudioChunkMetadata {
  roomName: string
  participant: string
  startTimeSec: number
  endTimeSec: number
  durationSec: number
  hasSpeech: boolean
  speechRatio: number
  peakAmplitude: number
  rmsAmplitude: number
  sampleRate: number
  channels: number
  bitsPerSample: number
}

/** Session recording metadata from HTTP headers */
export interface SessionRecordingMetadata {
  roomName: string
  participant: string // Identity (Ref<Person>) for user identification
  participantName: string // Display name for files/attachments
  startTimeSec: number
  endTimeSec: number
  sessionNumber: number
  size: number
}

export class AIControl {
  private readonly workspaces: Map<WorkspaceUuid, WorkspaceClient> = new Map<WorkspaceUuid, WorkspaceClient>()
  private readonly closeWorkspaceTimeouts: Map<WorkspaceUuid, NodeJS.Timeout> = new Map<WorkspaceUuid, NodeJS.Timeout>()
  private readonly connectingWorkspaces = new Map<WorkspaceUuid, Promise<void>>()

  readonly storageAdapter: StorageAdapter
  private transcriptionProducer: PlatformQueueProducer<TranscriptionTask> | undefined

  private readonly openai?: OpenAI

  // Try to obtain the encoding for the configured model. If the model is not recognised by js-tiktoken
  // (e.g. non-OpenAI models such as Together AI Llama derivatives) we gracefully fall back to the
  // universal `cl100k_base` encoding. This prevents a runtime "Unknown model" error while still
  // giving us a reasonable token count estimate for summaries.
  private readonly openaiEncoding = (() => {
    try {
      return encodingForModel(config.OpenAIModel as any)
    } catch (err) {
      return getEncoding('cl100k_base')
    }
  })()

  constructor (
    readonly personUuid: AccountUuid,
    readonly socialIds: SocialId[],
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

  setTranscriptionProducer (producer: PlatformQueueProducer<TranscriptionTask>): void {
    this.transcriptionProducer = producer
  }

  /**
   * Process incoming audio chunk: store in storage and queue for transcription
   */
  async processAudioChunk (gzipData: Buffer, metadata: AudioChunkMetadata): Promise<void> {
    // Parse workspace and roomId from room name (format: workspaceUuid_roomName_roomId)
    const parsed = metadata.roomName.split('_')
    const workspace = parsed[0] as WorkspaceUuid | undefined
    const roomId = parsed[parsed.length - 1] as Ref<Room> | undefined

    if (workspace === undefined) {
      this.ctx.error('Invalid room name format', { roomName: metadata.roomName })
      return
    }

    // Generate unique blob ID for this chunk
    const blobId = `audio-chunk-${uuid()}`

    // Get workspace client to access storage with proper wsIds
    const wsClient = await this.getWorkspaceClient(workspace)
    if (wsClient === undefined) {
      this.ctx.error('Failed to get workspace client for audio chunk', { workspace })
      return
    }

    try {
      // Store gzipped WAV in storage
      await this.storageAdapter.put(this.ctx, wsClient.wsIds, blobId, gzipData, 'application/gzip', gzipData.length)

      // Create placeholder message for pending transcription (with spinner indicator)
      let placeholderMessageId: Ref<ChatMessage> | undefined
      if (roomId !== undefined) {
        try {
          placeholderMessageId = await wsClient.createTranscriptionPlaceholder(
            this.ctx,
            metadata.participant as Ref<Person>,
            roomId,
            metadata.startTimeSec,
            metadata.endTimeSec,
            blobId
          )
          this.ctx.info('Created transcription placeholder', {
            placeholderMessageId,
            participant: metadata.participant,
            startTimeSec: metadata.startTimeSec
          })
        } catch (err: any) {
          this.ctx.warn('Failed to create transcription placeholder', { error: err.message })
          // Continue without placeholder - transcription will still work
        }
      }

      // Create transcription task
      const task: TranscriptionTask = {
        blobId,
        roomName: metadata.roomName,
        participant: metadata.participant,
        startTimeSec: metadata.startTimeSec,
        endTimeSec: metadata.endTimeSec,
        durationSec: metadata.durationSec,
        hasSpeech: metadata.hasSpeech,
        speechRatio: metadata.speechRatio,
        peakAmplitude: metadata.peakAmplitude,
        rmsAmplitude: metadata.rmsAmplitude,
        sampleRate: metadata.sampleRate,
        channels: metadata.channels,
        bitsPerSample: metadata.bitsPerSample,
        placeholderMessageId: placeholderMessageId as string | undefined
      }

      // Queue for transcription with partition key based on workspace+participant
      // This ensures fair processing when multiple users are speaking simultaneously
      if (this.transcriptionProducer !== undefined) {
        const partitionKey = `${workspace}_${metadata.participant}`
        await this.transcriptionProducer.send(this.ctx, workspace, [task], partitionKey)
        this.ctx.info('Audio chunk queued for transcription', {
          blobId,
          workspace,
          participant: metadata.participant,
          durationSec: metadata.durationSec,
          hasSpeech: metadata.hasSpeech,
          placeholderMessageId
        })
      } else {
        this.ctx.warn('Transcription producer not set, audio chunk stored but not queued', { blobId })
      }
    } catch (err: any) {
      this.ctx.error('Failed to process audio chunk', { error: err.message, workspace })
    }
  }

  /**
   * Process full session recording: stream directly to storage and attach to meeting minutes
   */
  async processSessionRecording (stream: Readable, metadata: SessionRecordingMetadata): Promise<void> {
    // Parse workspace and roomId from room name (format: workspaceUuid_roomName_roomId)
    const parsed = metadata.roomName.split('_')
    const workspace = parsed[0] as WorkspaceUuid | undefined
    const roomId = parsed[parsed.length - 1] as Ref<Room> | undefined

    if (workspace === undefined || roomId === undefined) {
      this.ctx.error('Invalid room name format for session', { roomName: metadata.roomName })
      return
    }

    // Get workspace client
    const wsClient = await this.getWorkspaceClient(workspace)
    if (wsClient === undefined) {
      this.ctx.error('Failed to get workspace client for session recording', { workspace })
      return
    }

    try {
      // Generate unique blob ID for this session
      const blobId = `session-${metadata.participant}-${uuid()}.ogg`

      // Stream OGG Opus directly to storage
      await this.storageAdapter.put(this.ctx, wsClient.wsIds, blobId, stream, 'audio/ogg', metadata.size)

      this.ctx.info('Session recording stored', {
        blobId,
        workspace,
        participant: metadata.participant,
        startTimeSec: metadata.startTimeSec,
        endTimeSec: metadata.endTimeSec,
        size: metadata.size
      })

      // Add attachment to meeting minutes
      await wsClient.addSessionAttachment(
        roomId,
        blobId,
        metadata.participantName,
        metadata.startTimeSec,
        metadata.endTimeSec,
        metadata.size,
        metadata.sessionNumber
      )
    } catch (err: any) {
      this.ctx.error('Failed to process session recording', { error: err.message, workspace })
    }
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

  async createWorkspaceClient (workspace: WorkspaceUuid): Promise<WorkspaceClient | undefined> {
    const isAssigned = await tryAssignToWorkspace(workspace, this.ctx)

    if (!isAssigned) {
      this.ctx.error('Cannot assign to workspace', { workspace })
      return
    }

    const token = generateToken(this.personUuid, workspace, { service: 'aibot' })
    const accountClient = getAccountClient(token)
    const wsLoginInfo = await accountClient.getLoginInfoByToken()

    // Since AIBOT is internal service, always use internal transactor endpoint.
    const endpoint = await getTransactorEndpoint(token, 'internal')

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
      endpoint,
      token,
      wsIds,
      this.personUuid,
      this.socialIds,
      this.ctx.newChild('create-workspace', {}, { span: false }),
      this.openai,
      this.openaiEncoding
    )
  }

  async initWorkspaceClient (workspace: WorkspaceUuid): Promise<void> {
    if (this.connectingWorkspaces.has(workspace)) {
      return await this.connectingWorkspaces.get(workspace)
    }

    const initPromise = (async () => {
      try {
        if (!this.workspaces.has(workspace)) {
          const client = await this.createWorkspaceClient(workspace)
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
      } catch (err: any) {
        this.ctx.error('Unknown error', { err })
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

  async translate (workspace: WorkspaceUuid, req: TranslateRequest): Promise<TranslateResponse | undefined> {
    if (this.openai === undefined) {
      return undefined
    }
    const html = jsonToHTML(markupToJSON(req.text))
    const result = await translateHtml(this.ctx, workspace, this.openai, html, req.lang)
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

    const summary = await summarizeMessages(this.ctx, workspace, this.openai, messagesToSummarize, req.lang)
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

  async processEvent (workspace: WorkspaceUuid, events: AIEventRequest[], control?: ConsumerControl): Promise<void> {
    if (this.openai === undefined) return

    const i1 = setInterval(() => {
      void control?.heartbeat()
    }, 1000)
    try {
      for (const event of events) {
        await control?.heartbeat()
        const wsClient = await this.getWorkspaceClient(workspace)
        if (wsClient === undefined) continue
        this.ctx.info('processing event', event)
        await wsClient.processMessageEvent(event, control)
      }
    } finally {
      clearInterval(i1)
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

    await wsClient.processLoveTranscript(this.ctx, request.transcript, request.participant, roomId)
  }
}
