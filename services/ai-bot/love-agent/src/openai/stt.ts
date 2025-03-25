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

import { RemoteParticipant, RemoteTrack, RemoteTrackPublication, Room } from '@livekit/rtc-node'
import * as openai from '@livekit/agents-plugin-openai'
import { multimodal } from '@livekit/agents'

import { Stt } from '../type'
import config from '../config.js'

export class STT implements Stt {
  private isInProgress = false

  private readonly trackBySid = new Map<string, RemoteTrack>()
  private readonly participantBySid = new Map<string, RemoteParticipant>()

  private readonly connectionBySid = new Map<string, openai.realtime.RealtimeSession>()

  private transcriptionCount = 0

  private readonly model = new openai.realtime.RealtimeModel({
    modalities: ['text'],
    instructions:
      'You are an expert transcription assistant. Your task is to listen to audio content and transcribe it into text with high accuracy. Do not summarize or skip any content; transcribe everything exactly as spoken.',
    model: config.OpenAiModel,
    apiKey: config.OpenaiApiKey,
    inputAudioTranscription: {
      model: config.OpenAiTranscriptModel
    },
    ...(config.OpenaiBaseUrl === '' ? {} : { baseUrl: config.OpenaiBaseUrl })
  })

  constructor (readonly room: Room) {}

  updateLanguage (language: string): void {
    /* noop */
  }

  async start (): Promise<void> {
    if (this.isInProgress) return
    console.log('Starting transcription', this.room.name)
    this.isInProgress = true

    for (const sid of this.trackBySid.keys()) {
      await this.subscribeOpenai(sid)
    }
  }

  stop (): void {
    if (!this.isInProgress) return
    console.log('Stopping transcription', this.room.name)
    this.isInProgress = false
    for (const sid of this.trackBySid.keys()) {
      this.unsubscribeOpenai(sid)
    }
  }

  async subscribe (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ): Promise<void> {
    const sid = publication.sid
    if (sid === undefined) return

    if (this.trackBySid.has(sid)) return
    this.trackBySid.set(sid, track)
    this.participantBySid.set(sid, participant)
    if (this.isInProgress) {
      await this.subscribeOpenai(sid)
    }
  }

  unsubscribe (_: RemoteTrack | undefined, publication: RemoteTrackPublication, participant: RemoteParticipant): void {
    const sid = publication.sid
    if (sid === undefined) return
    this.trackBySid.delete(sid)
    this.participantBySid.delete(sid)
    this.unsubscribeOpenai(sid)
  }

  unsubscribeOpenai (sid: string): void {
    const connection = this.connectionBySid.get(sid)
    if (connection !== undefined) {
      connection.removeAllListeners()
      void connection.close()
    }

    this.connectionBySid.delete(sid)
  }

  async subscribeOpenai (sid: string): Promise<void> {
    const track = this.trackBySid.get(sid)
    if (track === undefined) return
    if (this.connectionBySid.has(sid)) return
    const participant = this.participantBySid.get(sid)
    if (participant === undefined) return

    const agent = new multimodal.MultimodalAgent({
      model: this.model
    })

    const session = await agent
      .start(this.room, participant)
      .then((session) => session as openai.realtime.RealtimeSession)

    session.on('input_speech_transcription_completed', (res) => {
      if (res.transcript !== '') {
        void this.sendToPlatform(res.transcript, sid)
      }
    })

    this.connectionBySid.set(sid, session)
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
    for (const sid of this.connectionBySid.keys()) {
      this.unsubscribeOpenai(sid)
    }
  }
}
