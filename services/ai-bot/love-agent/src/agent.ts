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

import { cli, defineAgent, type JobContext, JobRequest, WorkerOptions } from '@livekit/agents'
import { fileURLToPath } from 'node:url'
import { RemoteParticipant, RemoteTrack, RemoteTrackPublication, RoomEvent, TrackKind } from '@livekit/rtc-node'

import { Metadata, TranscriptionStatus, Stt } from './type.js'
import config from './config.js'
import { getStt } from './utils.js'

function parseMetadata (metadata: string): Metadata {
  try {
    return JSON.parse(metadata) as Metadata
  } catch (e) {
    console.error('Error parsing metadata', e)
  }

  return {}
}

async function requestIdentity (roomName: string): Promise<{ identity: string, name: string } | undefined> {
  try {
    const res = await fetch(`${config.PlatformUrl}/love/${roomName}/identity`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + config.PlatformToken
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

  const identity = await requestIdentity(roomName)

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
      console.error('Room name is undefined')
      ctx.shutdown()
      return
    }

    const stt = getStt(ctx.room)

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
          console.log('Subscribing to track', participant.name, publication.sid)
          stt.subscribe(track, publication, participant)
        }
      }
    )

    ctx.room.on(
      RoomEvent.TrackUnsubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (publication.kind === TrackKind.KIND_AUDIO) {
          console.log('Unsubscribing from track', participant.name, publication.sid)
          stt.unsubscribe(track, publication, participant)
        }
      }
    )

    ctx.addShutdownCallback(async () => {
      stt.close()
    })
  }
})

export function runAgent (): void {
  cli.runApp(
    new WorkerOptions({
      agent: fileURLToPath(import.meta.url),
      requestFunc
    })
  )
}
