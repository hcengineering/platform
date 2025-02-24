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

import { AudioStream, RemoteParticipant, RemoteTrack, RemoteTrackPublication, Room } from '@livekit/rtc-node'
import {
  createClient,
  DeepgramClient,
  ListenLiveClient,
  LiveSchema,
  LiveTranscriptionEvent,
  LiveTranscriptionEvents,
  SOCKET_STATES
} from '@deepgram/sdk'

import { Stt } from '../type'
import config from '../config.js'

const KEEP_ALIVE_INTERVAL = 10 * 1000

const dgSchema: LiveSchema = {
  model: config.DeepgramModel,
  encoding: 'linear16',
  smart_format: true,
  endpointing: 500,
  interim_results: true,
  vad_events: true,
  utterance_end_ms: 1000,

  punctuate: true,
  language: 'en'
}

export class STT implements Stt {
  private readonly deepgram: DeepgramClient

  private isInProgress = false
  private language: string = 'en'

  private readonly trackBySid = new Map<string, RemoteTrack>()
  private readonly streamBySid = new Map<string, AudioStream>()
  private readonly participantBySid = new Map<string, RemoteParticipant>()

  private readonly dgConnectionBySid = new Map<string, ListenLiveClient>()
  private readonly intervalBySid = new Map<string, NodeJS.Timeout>()

  private transcriptionCount = 0

  constructor (readonly room: Room) {
    this.deepgram = createClient(config.DeepgramApiKey)
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
    console.log('Starting transcription', this.room.name)
    this.isInProgress = true

    for (const sid of this.trackBySid.keys()) {
      this.processTrack(sid)
    }
  }

  stop (): void {
    if (!this.isInProgress) return
    console.log('Stopping transcription', this.room.name)
    this.isInProgress = false
    for (const sid of this.trackBySid.keys()) {
      this.stopDeepgram(sid)
    }
  }

  subscribe (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant): void {
    const sid = publication.sid
    if (sid === undefined) return
    if (this.trackBySid.has(sid)) return
    this.trackBySid.set(sid, track)
    this.participantBySid.set(sid, participant)
    if (this.isInProgress) {
      this.processTrack(sid)
    }
  }

  unsubscribe (_: RemoteTrack | undefined, publication: RemoteTrackPublication, participant: RemoteParticipant): void {
    const sid = publication.sid
    if (sid === undefined) return
    this.trackBySid.delete(sid)
    this.participantBySid.delete(sid)
    this.stopDeepgram(sid)
  }

  stopDeepgram (sid: string): void {
    const stream = this.streamBySid.get(sid)
    if (stream !== undefined) {
      stream.close()
    }

    const dgConnection = this.dgConnectionBySid.get(sid)
    if (dgConnection !== undefined) {
      dgConnection.removeAllListeners()
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
    const language = this.language ?? 'en'
    const dgConnection = this.deepgram.listen.live({
      ...dgSchema,
      channels: stream.numChannels,
      sample_rate: stream.sampleRate,
      language,
      model: language === 'en' || language === 'en-US' ? config.DeepgramEnModel : config.DeepgramModel
    })
    console.log('Starting deepgram for track', this.room.name, sid)

    const interval = setInterval(() => {
      dgConnection.keepAlive()
    }, KEEP_ALIVE_INTERVAL)

    this.streamBySid.set(sid, stream)
    this.dgConnectionBySid.set(sid, dgConnection)
    this.intervalBySid.set(sid, interval)

    dgConnection.on(LiveTranscriptionEvents.Open, () => {
      dgConnection.on(LiveTranscriptionEvents.Transcript, (data: LiveTranscriptionEvent) => {
        const transcript = data?.channel?.alternatives[0].transcript
        const hasTranscript = transcript != null && transcript !== ''

        if (!hasTranscript) {
          return
        }

        if (data.speech_final === true) {
          void this.sendToPlatform(transcript, sid)
        } else if (data.is_final === true) {
          void this.sendToPlatform(transcript, sid)
        }
      })

      dgConnection.on(LiveTranscriptionEvents.Close, (d) => {
        this.stopDeepgram(sid)
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
      const dgConnection = this.dgConnectionBySid.get(sid)
      if (dgConnection === undefined) {
        stream.close()
        return
      }
      if (dgConnection.getReadyState() !== SOCKET_STATES.open) continue
      const buf = Buffer.from(frame.data.buffer)
      dgConnection.send(buf)
    }
  }

  async sendToPlatform (transcript: string, sid: string): Promise<void> {
    const request = {
      transcript,
      participant: this.participantBySid.get(sid)?.identity,
      roomName: this.room.name
    }

    this.transcriptionCount++

    if (this.transcriptionCount === 1 || this.transcriptionCount % 50 === 0) {
      console.log('Sending transcript', this.room.name, this.transcriptionCount)
    }

    try {
      await fetch(`${config.PlatformUrl}/love/transcript`, {
        method: 'POST',
        keepalive: true,
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
    this.trackBySid.clear()
    this.participantBySid.clear()
    for (const sid of this.dgConnectionBySid.keys()) {
      this.stopDeepgram(sid)
    }
  }
}
