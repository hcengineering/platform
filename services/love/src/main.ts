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
import { Ref, WorkspaceUuid } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import serverClient from '@hcengineering/server-client'
import { initStatisticsContext, StorageConfig, StorageConfiguration } from '@hcengineering/server-core'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import serverToken, { decodeToken } from '@hcengineering/server-token'
import { RoomMetadata, TranscriptionStatus, MeetingMinutes } from '@hcengineering/love'
import cors from 'cors'
import express from 'express'
import { IncomingHttpHeaders } from 'http'
import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  RoomServiceClient,
  S3Upload,
  WebhookReceiver
} from 'livekit-server-sdk'
import { v4 as uuid } from 'uuid'
import config from './config'
import { WorkspaceClient } from './workspaceClient'

const extractToken = (header: IncomingHttpHeaders): any => {
  try {
    return header.authorization?.slice(7) ?? ''
  } catch {
    return undefined
  }
}

export const main = async (): Promise<void> => {
  setMetadata(serverClient.metadata.Endpoint, config.AccountsURL)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
  setMetadata(serverToken.metadata.Secret, config.Secret)

  const storageConfigs: StorageConfiguration = storageConfigFromEnv()

  const ctx = initStatisticsContext('love', {})

  const storageConfig = storageConfigs.storages.findLast((p) => p.name === config.StorageProviderName)
  const storageAdapter = buildStorageFromConfig(storageConfigs)
  const app = express()
  const port = config.Port
  app.use(cors())
  app.use(express.raw({ type: 'application/webhook+json' }))
  app.use(express.json())

  const receiver = new WebhookReceiver(config.ApiKey, config.ApiSecret)
  const roomClient = new RoomServiceClient(config.LiveKitHost, config.ApiKey, config.ApiSecret)
  const egressClient = new EgressClient(config.LiveKitHost, config.ApiKey, config.ApiSecret)
  const dataByUUID = new Map<
  string,
  {
    name: string
    workspace: WorkspaceUuid
    meetingMinutes?: Ref<MeetingMinutes>
  }
  >()

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/webhook', async (req, res) => {
    try {
      const event = await receiver.receive(req.body, req.get('Authorization'))
      if (event.event === 'egress_ended' && event.egressInfo !== undefined) {
        for (const res of event.egressInfo.fileResults) {
          const data = dataByUUID.get(res.filename)
          if (data !== undefined) {
            const prefix = rootPrefix(storageConfig, data.workspace)
            const filename = stripPrefix(prefix, res.filename)
            const storedBlob = await storageAdapter.stat(ctx, data.workspace, filename)
            if (storedBlob !== undefined) {
              const client = await WorkspaceClient.create(data.workspace, ctx)
              await client.saveFile(filename, data.name, storedBlob, data.meetingMinutes)
              await client.close()
            }
            dataByUUID.delete(res.filename)
          } else {
            console.log('no data found for', res.filename)
          }
        }
        res.send()
        return
      }
      res.status(400).send()
    } catch (e) {
      console.error(e)
      res.status(500).send()
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/getToken', async (req, res) => {
    const roomName = req.body.roomName
    const _id = req.body._id
    const participantName = req.body.participantName
    res.send(await createToken(roomName, _id, participantName))
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/checkRecordAvailable', async (_req, res) => {
    res.send(await checkRecordAvailable(storageConfig))
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/startRecord', async (req, res) => {
    const token = extractToken(req.headers)

    if (token === undefined) {
      res.status(401).send()
      return
    }

    const roomName = req.body.roomName
    const room = req.body.room
    const meetingMinutes = req.body.meetingMinutes
    const { workspace } = decodeToken(token)

    try {
      const dateStr = new Date().toISOString().replace('T', '_').slice(0, 19)
      const name = `${room}_${dateStr}.mp4`
      const id = await startRecord(storageConfig, egressClient, roomClient, roomName, workspace)
      dataByUUID.set(id, { name, workspace, meetingMinutes })
      ctx.info('Start recording', { workspace, roomName, meetingMinutes })
      res.send()
    } catch (e) {
      console.error(e)
      res.status(500).send()
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/stopRecord', async (req, res) => {
    const token = extractToken(req.headers)

    if (token === undefined) {
      res.status(401).send()
      return
    }
    // just check token
    decodeToken(token)
    await updateMetadata(roomClient, req.body.roomName, { recording: false })
    void stopEgress(egressClient, req.body.roomName)
    res.send()
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/transcription', async (req, res) => {
    const token = extractToken(req.headers)

    if (token === undefined) {
      res.status(401).send()
      return
    }
    // just check token
    decodeToken(token)

    const roomName = req.body.roomName
    const language = req.body.language
    const transcription = req.body.transcription as TranscriptionStatus

    if (roomName == null) {
      res.status(400).send()
      return
    }

    const metadata = language != null ? { transcription, language } : { transcription }
    try {
      await updateMetadata(roomClient, roomName, metadata)
      res.status(200).send()
    } catch (e) {
      console.error(e)
      res.status(500).send()
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/language', async (req, res) => {
    const token = extractToken(req.headers)

    if (token === undefined) {
      res.status(401).send()
      return
    }
    // just check token
    decodeToken(token)

    const roomName = req.body.roomName
    const language = req.body.language
    if (roomName == null || language == null) {
      res.status(400).send()
      return
    }
    try {
      await updateMetadata(roomClient, roomName, { language })
      res.send()
    } catch (e) {
      console.error(e)
      res.status(500).send()
    }
  })

  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
  })

  const shutdown = (): void => {
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
}

const stopEgress = async (egressClient: EgressClient, roomName: string): Promise<void> => {
  const egresses = await egressClient.listEgress({ active: true, roomName })
  for (const egress of egresses) {
    await egressClient.stopEgress(egress.egressId)
  }
}

const createToken = async (roomName: string, _id: string, participantName: string): Promise<string> => {
  const at = new AccessToken(config.ApiKey, config.ApiSecret, {
    identity: _id,
    name: participantName,
    // token to expire after 10 minutes
    ttl: '10m'
  })
  at.addGrant({ roomJoin: true, room: roomName })

  return await at.toJwt()
}

const checkRecordAvailable = async (storageConfig: StorageConfig | undefined): Promise<boolean> => {
  return storageConfig !== undefined
}

function getBucket (storageConfig: any, workspaceId: WorkspaceUuid): string {
  return storageConfig.rootBucket ?? (storageConfig.bucketPrefix ?? '') + workspaceId
}

function getBucketFolder (workspaceId: WorkspaceUuid): string {
  return workspaceId
}

function getDocumentKey (storageConfig: any, workspace: WorkspaceUuid, name: string): string {
  return storageConfig.rootBucket === undefined ? name : `${getBucketFolder(workspace)}/${name}`
}

function stripPrefix (prefix: string | undefined, key: string): string {
  if (prefix !== undefined && key.startsWith(prefix)) {
    return key.slice(prefix.length)
  }
  return key
}

function rootPrefix (storageConfig: any, workspaceId: WorkspaceUuid): string | undefined {
  return storageConfig.rootBucket !== undefined ? getBucketFolder(workspaceId) + '/' : undefined
}

const startRecord = async (
  storageConfig: StorageConfig | undefined,
  egressClient: EgressClient,
  roomClient: RoomServiceClient,
  roomName: string,
  workspaceId: WorkspaceUuid
): Promise<string> => {
  if (storageConfig === undefined) {
    console.error('please provide s3 storage configuration')
    throw new Error('please provide s3 storage configuration')
  }
  const endpoint = storageConfig.endpoint
  const accessKey = (storageConfig as any).accessKey
  const secret = (storageConfig as any).secretKey
  const region = (storageConfig as any).region ?? 'auto'
  const bucket = getBucket(storageConfig, workspaceId)
  const name = uuid()
  const filepath = getDocumentKey(storageConfig, workspaceId, `${name}.mp4`)
  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath,
    output: {
      case: 's3',
      value: new S3Upload({
        endpoint,
        accessKey,
        region,
        secret,
        bucket
      })
    }
  })
  await updateMetadata(roomClient, roomName, { recording: true })
  await egressClient.startRoomCompositeEgress(roomName, { file: output }, { layout: 'grid' })
  return filepath
}

function parseMetadata (metadata?: string | null): RoomMetadata {
  if (metadata === '' || metadata == null) return {}

  try {
    return JSON.parse(metadata) as RoomMetadata
  } catch (e) {
    return {}
  }
}

async function updateMetadata (
  roomClient: RoomServiceClient,
  roomName: string,
  metadata: Partial<RoomMetadata>
): Promise<void> {
  const room = (await roomClient.listRooms([roomName]))[0]
  const currentMetadata = parseMetadata(room?.metadata)

  await roomClient.updateRoomMetadata(roomName, JSON.stringify({ ...currentMetadata, ...metadata }))
}
