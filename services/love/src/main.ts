//
// Copyright © 2024 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  getClient as getAccountClientRaw,
  isWorkspaceLoginInfo,
  type AccountClient
} from '@hcengineering/account-client'
import { createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import { MeasureContext, newMetrics, systemAccountUuid } from '@hcengineering/core'
import {
  ParticipantMetadata,
  queueEvents,
  QueueMeetingEvent,
  QueueMeetingMessage,
  QueueMeetingUpdateMetadataMessage,
  QueueWebhookMeetingMessage,
  RoomMetadata
} from '@hcengineering/love'
import { setMetadata } from '@hcengineering/platform'
import serverClient from '@hcengineering/server-client'

import { getPlatformQueue } from '@hcengineering/kafka'
import { initStatisticsContext, QueueTopic, StorageConfig, StorageConfiguration } from '@hcengineering/server-core'
import { storageConfigFromEnv } from '@hcengineering/server-storage'
import serverToken, { generateToken, readToken } from '@hcengineering/server-token'
import cors from 'cors'
import express, { type Request } from 'express'
import {
  EgressClient,
  RoomAgentDispatch,
  RoomServiceClient,
  WebhookReceiver,
  type WebhookEvent
} from 'livekit-server-sdk'
import { join } from 'path'
import { updateLiveKitSessions } from './billing'
import config from './config'
import { LiveKitPollingService } from './polling'
import { RecordingProcessor } from './recordings'
import { WebhookProcessor } from './webhook'
import { routeWebhookEvent } from './webhookEvents'
import { WorkspaceClient } from './workspaceClient'
import { GuestManager } from './guests'
import { createToken, decodeMeetingToken, getRoomName, parseMetadata } from './utils'

export { getWebhookRoomName } from './webhookEvents'

function getAccountClient (token?: string): AccountClient {
  return getAccountClientRaw(config.AccountsURL, token)
}

export const main = async (): Promise<void> => {
  setMetadata(serverClient.metadata.Endpoint, config.AccountsURL)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverToken.metadata.Service, 'love')

  const storageConfigs: StorageConfiguration = storageConfigFromEnv()
  const s3StorageConfigs: StorageConfiguration | undefined =
    config.S3StorageConfig !== undefined ? storageConfigFromEnv(config.S3StorageConfig) : undefined

  const queue = getPlatformQueue('love-client')

  const ctx = initStatisticsContext('love', {
    factory: () =>
      createOpenTelemetryMetricsContext(
        'love',
        {},
        {},
        newMetrics(),
        new SplitLogger('love', {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })

  const storageConfig = storageConfigs.storages.find((it) => ['datalake', 's3'].includes(it.kind))
  const s3storageConfig = s3StorageConfigs?.storages.findLast((p) => p.kind === 's3')

  const port = config.Port

  const app = express()
  app.disable('x-powered-by')
  app.use(cors())
  app.use(express.raw({ type: 'application/webhook+json' }))
  app.use(express.json())

  const roomClient = new RoomServiceClient(config.LiveKitHost, config.ApiKey, config.ApiSecret)
  const egressClient = new EgressClient(config.LiveKitHost, config.ApiKey, config.ApiSecret)

  const eventProducer = queue.getProducer<QueueMeetingMessage>(ctx, QueueTopic.LoveQueue)

  const webhookProcessor = new WebhookProcessor(
    ctx,
    roomClient,
    eventProducer,
    egressClient,
    storageConfig,
    s3storageConfig
  )

  const recordingProcessor = new RecordingProcessor(
    ctx.newChild('recordings', {}),
    roomClient,
    eventProducer,
    egressClient,
    storageConfig,
    s3storageConfig
  )

  const guestManager = new GuestManager(ctx, roomClient)

  const receivers = [new WebhookReceiver(config.ApiKey, config.ApiSecret)]

  if (config.LiveKitWebhookKey !== '' && config.LiveKitWebhookSecret !== '') {
    receivers.push(new WebhookReceiver(config.LiveKitWebhookKey, config.LiveKitWebhookSecret))
  }

  async function decodeEvent (req: Request): Promise<WebhookEvent> {
    for (const r of receivers) {
      try {
        return await r.receive(req.body, req.get('Authorization'))
      } catch (e) {
        // Ignore
      }
    }
    throw new Error('Failed to decode webhook event with all receivers')
  }

  const eventConsumer = queue.createConsumer(ctx, QueueTopic.LoveQueue, 'love-webhook-producer', async (ctx, msg) => {
    const queueMsg = msg.value as QueueMeetingMessage
    switch (queueMsg.type) {
      case QueueMeetingEvent.webhook: {
        const event = (queueMsg as QueueWebhookMeetingMessage).webhook
        await ctx.with('handle-webhook', {}, () =>
          webhookProcessor.processEvent(event, {
            meetingId: queueMsg.meetingId,
            workspace: msg.workspace
          })
        )
        break
      }
      case QueueMeetingEvent.updateMetadata: {
        const metadataMsg = queueMsg as QueueMeetingUpdateMetadataMessage
        await updateMetadata(ctx, roomClient, metadataMsg.roomName, metadataMsg.metadata)
        break
      }
      case QueueMeetingEvent.started: {
        const wsClient = await WorkspaceClient.create(msg.workspace, ctx)
        const mm = await wsClient.findMeetingById(queueMsg.meetingId)
        if (mm !== undefined && mm.startWithRecording === true) {
          const sysToken = generateToken(systemAccountUuid, msg.workspace, { service: 'love' })
          const wsLoginInfo = await getAccountClient(sysToken).getLoginInfoByToken()
          if (!isWorkspaceLoginInfo(wsLoginInfo)) {
            break
          }
          await recordingProcessor.startRecording(
            getRoomName(msg.workspace, queueMsg.meetingId),
            msg.workspace,
            queueMsg.meetingId,
            wsLoginInfo,
            mm.title
          )
        }
        break
      }
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/webhook', async (req, res) => {
    try {
      const rawEvent: WebhookEvent = await decodeEvent(req)
      const routed = routeWebhookEvent(ctx, rawEvent, config.LiveKitProject)
      if (routed === undefined) return

      const { event, roomName } = routed
      await eventProducer.send(ctx, roomName.workspace, [queueEvents.webhook(roomName.meetingId, event)])
    } catch (e) {
      ctx.error('Failed to process webhook event', { error: e })
    } finally {
      res.status(200).send() // We should always say event is received
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/getToken', async (req, res) => {
    const { meetingId, workspaceId } = decodeMeetingToken(req, res)
    if (meetingId == null || workspaceId == null) {
      return
    }

    const _id = req.body._id
    const participantName = req.body.participantName
    const x = req.body.x ?? -1
    const y = req.body.y ?? -1
    const roomName = getRoomName(workspaceId, meetingId)

    const room = await roomClient.listRooms([roomName])
    // TODO: Retry creation
    if (room === undefined || room.length === 0) {
      ctx.info('Creating room', { roomName })
      try {
        await roomClient.createRoom({
          metadata: JSON.stringify({
            projectKey: config.LiveKitProject,
            workspaceId,
            meetingId
          } satisfies RoomMetadata),
          departureTimeout: 3,
          name: roomName,
          agents: config.Agents.map((it) => new RoomAgentDispatch({ agentName: it }))
        })
      } catch (err: any) {
        console.error('Error creating room:', err)
      }
    }

    res.send(
      await createToken(
        roomName,
        _id,
        participantName,
        JSON.stringify({
          x,
          y
        } satisfies ParticipantMetadata)
      )
    )
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/guestToken', async (req, res) => {
    await guestManager.handleGuestToken(req, res)
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/guestInfo', async (req, res) => {
    await guestManager.handleGuestInfo(req, res)
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/guestJoin', async (req, res) => {
    await guestManager.handleGuestJoin(req, res)
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/checkRecordAvailable', async (_req, res) => {
    if (!config.RecordingEnabled) {
      res.send(false)
      return
    }
    res.send(await checkRecordAvailable(ctx, storageConfig, s3storageConfig))
  })

  app.get('/checkTranscriptionAvailable', (_req, res) => {
    res.send(config.TranscriptionEnabled)
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/startRecord', async (req, res) => {
    if (!config.RecordingEnabled) {
      res.status(403).send({ error: 'Recording is disabled on this server' })
      return
    }

    const { meetingId, workspaceId } = decodeMeetingToken(req, res)
    if (meetingId == null || workspaceId == null) {
      return
    }

    const roomName = getRoomName(workspaceId, meetingId)

    try {
      const token = readToken(req.headers)
      const wsLoginInfo = await getAccountClient(token).getLoginInfoByToken()
      if (!isWorkspaceLoginInfo(wsLoginInfo)) {
        console.error('No workspace found for the token')
        res.status(401).send()
        return
      }

      await recordingProcessor.startRecording(
        roomName,
        workspaceId,
        meetingId,
        wsLoginInfo,
        req.body.title ?? 'recording'
      )
      res.send()
    } catch (e) {
      console.error(e)
      res.status(500).send()
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/stopRecord', async (req, res) => {
    const { meetingId, workspaceId } = decodeMeetingToken(req, res)
    if (meetingId == null || workspaceId == null) {
      return
    }

    const roomName = getRoomName(workspaceId, meetingId)

    try {
      void recordingProcessor.stopRecording(roomName, workspaceId, meetingId)
      res.send()
    } catch (e) {
      console.error(e)
      res.status(500).send()
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/transcription', async (req, res) => {
    const { meetingId, workspaceId } = decodeMeetingToken(req, res)
    if (meetingId == null || workspaceId == null) {
      return
    }

    const roomName = getRoomName(workspaceId, meetingId)

    const language = req.body.language
    const transcription = req.body.transcription ?? false

    // Stopping is always allowed so that already running sessions can be finished
    if (!config.TranscriptionEnabled && transcription) {
      res.status(403).send({ error: 'Transcription is disabled on this server' })
      return
    }

    if (typeof roomName !== 'string') {
      res.status(400).send()
      return
    }

    try {
      // Check if LiveKit room exists before updating transcription
      const existingRooms = await roomClient.listRooms([roomName])
      if (existingRooms === undefined || existingRooms.length === 0) {
        ctx.error('Cannot update transcription: LiveKit room does not exist', { roomName })
        res.status(404).send({ error: 'Room does not exist. Please ensure participants have joined the meeting.' })
        return
      }

      const metadata = language != null ? { transcription, language } : { transcription }
      await eventProducer.send(ctx, workspaceId, [queueEvents.updateMetadata(meetingId, roomName, metadata)])
      res.status(200).send()
    } catch (e) {
      console.error(e)
      res.status(500).send()
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/language', async (req, res) => {
    const { meetingId, workspaceId } = decodeMeetingToken(req, res)
    if (meetingId == null || workspaceId == null) {
      return
    }

    const roomName = getRoomName(workspaceId, meetingId)

    const language = req.body.language

    try {
      await eventProducer.send(ctx, workspaceId, [
        queueEvents.updateMetadata(meetingId, roomName, {
          language
        })
      ])
      res.send()
    } catch (e) {
      console.error(e)
      res.status(500).send()
    }
  })

  // Initialize polling service if enabled
  const pollingService = new LiveKitPollingService(ctx, roomClient, {
    intervalMs: config.PollingIntervalMs,
    projectKey: config.LiveKitProject
  })
  pollingService.start()

  const workspaceConsumer = queue.createConsumer(ctx, QueueTopic.Workspace, 'love-client', async (ctx, msg, queue) => {
    pollingService.addWorkspaceToCheck(msg.workspace)
  })

  const workspaceTxConsumer = queue.createConsumer(ctx, QueueTopic.Tx, 'love-client', async (ctx, msg) => {
    pollingService.addWorkspaceToCheck(msg.workspace)
  })

  ctx.info('LiveKit polling service started', {
    intervalMs: config.PollingIntervalMs,
    projectKey: config.LiveKitProject
  })

  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
  })

  const shutdown = (): void => {
    void workspaceConsumer.close()
    void workspaceTxConsumer.close()
    void eventConsumer.close()
    void eventProducer.close()
    void queue.shutdown()
    pollingService.stop()
    void WorkspaceClient.closeAll()
    server.close(() => process.exit())
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (e) => {
    console.error(e)
  })
  process.on('unhandledRejection', (e) => {
    console.error(e)
  })

  if (config.BillingUrl !== '' && config.UseGlobalLiveKit) {
    setInterval(
      () => {
        void updateLiveKitSessions(ctx).catch((error) => {
          ctx.error('failed to update livekit sessions', { error })
        })
      },
      config.BillingPollInterval * 60 * 1000
    )
    try {
      void updateLiveKitSessions(ctx)
    } catch {}
  }
}

const checkRecordAvailable = async (
  ctx: MeasureContext,
  storageConfig: StorageConfig | undefined,
  s3storageConfig: StorageConfig | undefined
): Promise<boolean> => {
  if (storageConfig !== undefined && storageConfig.kind === 's3') return true
  if (storageConfig !== undefined && storageConfig.kind === 'datalake' && s3storageConfig !== undefined) return true
  ctx.error('NO S3 storage config storage:', {
    storageConfig: storageConfig?.kind,
    s3storageConfig: s3storageConfig?.kind
  })
  return false
}

async function updateMetadata (
  ctx: MeasureContext,
  roomClient: RoomServiceClient,
  roomName: string,
  metadata: Partial<RoomMetadata>
): Promise<void> {
  const room = (await roomClient.listRooms([roomName]))[0]
  if (room === undefined) {
    ctx.warn(`Cannot update metadata: room "${roomName}" does not exist`)
    return
  }
  const currentMetadata = parseMetadata(room.metadata)

  await roomClient.updateRoomMetadata(roomName, JSON.stringify({ ...currentMetadata, ...metadata }))
}
