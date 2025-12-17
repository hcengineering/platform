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

// Load environment variables BEFORE any other imports that may use them
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { cli, defineAgent, type JobContext, JobRequest, ServerOptions } from '@livekit/agents'
import { RemoteParticipant, RemoteTrack, RemoteTrackPublication, RoomEvent, TrackKind } from '@livekit/rtc-node'

import { Metadata, TranscriptionStatus, Stt } from './type.js'
import config from './config.js'
import { getStt } from './utils.js'
import { generateToken, systemAccountUuid } from './token.js'
import { fileURLToPath } from 'node:url'

function parseMetadata (metadata: string): Metadata {
  try {
    return JSON.parse(metadata) as Metadata
  } catch (e) {
    console.error('Error parsing metadata', e)
  }

  return {}
}

async function requestIdentity (token: string, roomName: string): Promise<{ identity: string, name: string } | undefined> {
  try {
    const res = await fetch(`${config.PlatformUrl}/love/${encodeURIComponent(roomName)}/identity`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      }
    })

    if (!res.ok) {
      return undefined
    }
    return await res.json()
  } catch (e) {
    console.error('Error during request identity', e)
  }
}

const requestFunc = async (req: JobRequest): Promise<void> => {
  const roomName = req.room?.name

  if (roomName == null) {
    console.error('Room name is undefined', { room: req.room })
    await req.reject()
    return
  }

  const token = generateToken(systemAccountUuid, undefined, { service: 'love-agent', roomName })

  const identity = await requestIdentity(token, roomName)

  if (identity?.identity == null) {
    console.error('No ai identity', { roomName })
    await req.reject()
    return
  }

  await req.accept(identity.name, identity.identity)
}

function applyMetadata (data: string | undefined, stt: Stt): void {
  if (data == null || data === '') return
  const metadata = parseMetadata(data)

  if (metadata.language != null) {
    stt.updateLanguage(metadata.language)
  }

  if (metadata.transcription === TranscriptionStatus.InProgress) {
    stt.start()
  } else if (
    metadata.transcription === TranscriptionStatus.Completed ||
    metadata.transcription === TranscriptionStatus.Idle
  ) {
    stt.stop()
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect()
    await ctx.waitForParticipant()

    const roomName = ctx.room.name

    if (roomName === undefined) {
      console.error('Room name is undefined', { room: ctx.room })
      ctx.shutdown()
      return
    }

    const workspace = (roomName.split('_')[0] ?? '').trim()

    if (workspace === '') {
      console.error('Workspace is not defined', { roomName })
      ctx.shutdown()
      return
    }

    const token = generateToken(systemAccountUuid, undefined, { service: 'love-agent' })

    const stt = getStt(ctx.room, workspace, token)

    if (stt === undefined) {
      console.error('Transcription provider is not configured')
      ctx.shutdown()
      return
    }

    applyMetadata(ctx.room.metadata, stt)

    ctx.room.on(RoomEvent.RoomMetadataChanged, (data) => {
      applyMetadata(data, stt)
    })

    ctx.room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (publication.kind === TrackKind.KIND_AUDIO) {
          console.info('Subscribing to track', { participant: participant.name, sid: publication.sid, workspace })
          stt.subscribe(track, publication, participant)
        }
      }
    )

    ctx.room.on(
      RoomEvent.TrackUnsubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (publication.kind === TrackKind.KIND_AUDIO) {
          console.info('Unsubscribing from track', { participant: participant.name, sid: publication.sid })
          // Fire and forget - unsubscribe handles its own async operations
          // We can't await here as the event handler is sync, but unsubscribe will complete in background
          void stt.unsubscribe(track, publication, participant)
        }
      }
    )

    ctx.addShutdownCallback(async () => {
      // Wait for all session finalizations to complete before shutdown
      await stt.close()
    })
  }
})

export function runAgent (): void {
  console.info('Starting love-agent v1')
  console.info(`Platform URL: ${config.PlatformUrl}`)
  console.info(`Live kit: ${config.LiveKitApiUrl}`)
  console.info(`Debug mode: ${config.Debug}`)
  if (config.Debug) {
    console.info('Debug mode enabled - audio files will be kept after sending')
  }
  console.info(`File: ${fileURLToPath(import.meta.url)}`)
  cli.runApp(
    new ServerOptions({
      jobMemoryLimitMB: 512,
      port: 8881,
      agent: fileURLToPath(import.meta.url),
      requestFunc
    })
  )
}
