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

import { AudioStream, RemoteParticipant, RemoteTrack, RemoteTrackPublication } from '@livekit/rtc-node'
import {
  createClient,
  DeepgramClient,
  ListenLiveClient,
  LiveTranscriptionEvents,
  LiveTranscriptionEvent,
  LiveSchema
} from '@deepgram/sdk'

import config from './config.js'

const KEEP_ALIVE_INTERVAL = 10 * 1000

const dgSchema: LiveSchema = {
  model: 'nova-2-general',
  encoding: 'linear16',
  smart_format: true,
  endpointing: 500,
  interim_results: true,
  vad_events: true,
  utterance_end_ms: 1000,

  punctuate: true,
  language: 'en'
}

export class STT {
  private readonly deepgram: DeepgramClient

  private isInProgress = false
  private language: string = 'en'

  private readonly trackBySid = new Map<string, RemoteTrack>()
  private readonly streamBySid = new Map<string, AudioStream>()
  private readonly mutedTracks = new Set<string>()
  private readonly participantBySid = new Map<string, RemoteParticipant>()

  private readonly dgConnectionBySid = new Map<string, ListenLiveClient>()
  private readonly intervalBySid = new Map<string, NodeJS.Timeout>()

  private readonly transcriptsBySid = new Map<string, { value: string, startedOn: number }>()

  private readonly interval: NodeJS.Timeout

  constructor (private readonly name: string) {
    this.deepgram = createClient(config.DeepgramApiKey)
    this.interval = this.interval = setInterval(() => {
      this.sendTranscriptToPlatform()
    }, config.TranscriptDelay)
  }

  sendTranscriptToPlatform (): void {
    const now = Date.now()
    for (const [sid, transcript] of this.transcriptsBySid.entries()) {
      if (now - transcript.startedOn > config.TranscriptDelay) {
        void this.sendToPlatform(transcript.value, sid)
        this.transcriptsBySid.delete(sid)
      }
    }
  }

  updateLanguage (language: string): void {
    const shouldRestart = (this.language ?? 'en') !== language
    this.language = language
    if (shouldRestart) {
      this.stop()
      this.start()
    }
  }

  start (): void {
    if (this.isInProgress) return
    this.isInProgress = true

    for (const sid of this.trackBySid.keys()) {
      this.processTrack(sid)
    }
  }

  stop (): void {
    if (!this.isInProgress) return
    this.isInProgress = false
    for (const sid of this.trackBySid.keys()) {
      this.stopDeepgram(sid)
    }
  }

  mute (sid: string): void {
    this.mutedTracks.add(sid)
  }

  unmute (sid: string): void {
    this.mutedTracks.delete(sid)
  }

  subscribe (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant): void {
    if (this.trackBySid.has(publication.sid)) return
    this.trackBySid.set(publication.sid, track)
    this.participantBySid.set(publication.sid, participant)
    if (track.muted) {
      this.mutedTracks.add(publication.sid)
    }
    if (this.isInProgress) {
      this.processTrack(publication.sid)
    }
  }

  unsubscribe (
    _: RemoteTrack | undefined,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ): void {
    this.trackBySid.delete(publication.sid)
    this.participantBySid.delete(participant.sid)
    this.mutedTracks.delete(publication.sid)
    this.stopDeepgram(publication.sid)
  }

  stopDeepgram (sid: string): void {
    const stream = this.streamBySid.get(sid)
    if (stream !== undefined) {
      stream.close()
    }

    const dgConnection = this.dgConnectionBySid.get(sid)
    if (dgConnection !== undefined) {
      dgConnection.disconnect()
    }

    const interval = this.intervalBySid.get(sid)
    if (interval !== undefined) {
      clearInterval(interval)
    }

    this.intervalBySid.delete(sid)
    this.dgConnectionBySid.delete(sid)
    this.streamBySid.delete(sid)
  }

  processTrack (sid: string): void {
    const track = this.trackBySid.get(sid)
    if (track === undefined) return
    if (this.dgConnectionBySid.has(sid)) return

    const stream = new AudioStream(track)
    const dgConnection = this.deepgram.listen.live({
      ...dgSchema,
      channels: stream.numChannels,
      sample_rate: stream.sampleRate,
      language: this.language ?? 'en'
    })

    const interval = setInterval(() => {
      dgConnection.keepAlive()
    }, KEEP_ALIVE_INTERVAL)

    this.streamBySid.set(sid, stream)
    this.dgConnectionBySid.set(track.sid, dgConnection)
    this.intervalBySid.set(track.sid, interval)

    dgConnection.on(LiveTranscriptionEvents.Open, () => {
      dgConnection.on(LiveTranscriptionEvents.Transcript, (data: LiveTranscriptionEvent) => {
        const transcript = data?.channel?.alternatives[0].transcript
        if (transcript != null && transcript !== '') {
          const prevData = this.transcriptsBySid.get(sid)
          const prevValue = prevData?.value ?? ''
          if (data.is_final === true) {
            // TODO: how to join the final transcript ?
            this.transcriptsBySid.set(sid, { value: prevValue + ' ' + transcript, startedOn: prevData?.startedOn ?? Date.now() })
          }
          if (data.speech_final === true) {
            const result = this.transcriptsBySid.get(sid)?.value
            if (result != null) {
              void this.sendToPlatform(result, sid)
            }
            this.transcriptsBySid.delete(sid)
          }
        }
      })

      dgConnection.on(LiveTranscriptionEvents.Close, (d) => {
        console.log('Connection closed.', d, track.sid)
      })

      dgConnection.on(LiveTranscriptionEvents.Error, (err) => {
        console.error(err)
      })
    })

    void this.streamToDeepgram(sid, stream)
  }

  async streamToDeepgram (sid: string, stream: AudioStream): Promise<void> {
    for await (const frame of stream) {
      if (!this.isInProgress) continue
      if (this.mutedTracks.has(sid)) continue
      const dgConnection = this.dgConnectionBySid.get(sid)
      if (dgConnection === undefined) {
        stream.close()
        return
      }
      const buf = Buffer.from(frame.data.buffer)
      dgConnection.send(buf)
    }
  }

  async sendToPlatform (transcript: string, sid: string): Promise<void> {
    const request = {
      transcript,
      participant: this.participantBySid.get(sid)?.identity,
      roomName: this.name
    }

    try {
      await fetch(`${config.PlatformUrl}/transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + config.PlatformToken
        },
        body: JSON.stringify(request)
      })
    } catch (e) {
      console.error('Error sending to platform', e)
    }
  }

  close (): void {
    clearInterval(this.interval)
    for (const sid of this.transcriptsBySid.keys()) {
      this.trackBySid.delete(sid)
      this.participantBySid.delete(sid)
      this.stopDeepgram(sid)
    }
  }
}
