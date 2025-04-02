//
// Copyright © 2025 Hardcore Engineering Inc.
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
import WebSocket from 'ws'

import { Stt } from '../type'
import config from '../config.js'

interface Session {
  expireAt: number
}

const prompt =
  'Please transcribe the speech accurately and clearly. Ignore background noise, unintelligible sounds, and irrelevant words. Use the language spoken by the user without translating it. Preserve punctuation and sentence structure where possible.'

export class STT implements Stt {
  private isInProgress = false
  private language: string = 'en'

  private readonly trackBySid = new Map<string, RemoteTrack>()
  private readonly streamBySid = new Map<string, AudioStream>()
  private readonly participantBySid = new Map<string, RemoteParticipant>()

  private readonly connectionBySid = new Map<string, WebSocket>()
  private readonly sessionBySid = new Map<string, any>()

  private transcriptionCount = 0

  constructor (readonly room: Room) {}

  updateLanguage (language: string): void {
    if (language === this.language) return
    if (!config.OpenaiProvideLanguage) return
    this.language = language

    for (const [, connection] of this.connectionBySid) {
      try {
        connection.send(
          JSON.stringify({
            type: 'transcription_session.update',
            session: {
              input_audio_transcription: {
                model: config.OpenAiTranscriptModel,
                prompt,
                language
              }
            }
          })
        )
      } catch (e) {
        console.error(e)
      }
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
    console.log('Stopping transcription', this.room.name)
    this.isInProgress = false
    for (const sid of this.trackBySid.keys()) {
      this.stopWs(sid)
    }
  }

  subscribe (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant): void {
    console.log('subscribe', track.kind, publication.sid, participant.identity)
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
    this.stopWs(sid)
  }

  stopWs (sid: string): void {
    try {
      const stream = this.streamBySid.get(sid)
      if (stream !== undefined) {
        stream.close()
      }

      const connection: WebSocket | undefined = this.connectionBySid.get(sid)

      this.connectionBySid.delete(sid)
      this.streamBySid.delete(sid)
      this.sessionBySid.delete(sid)

      if (connection !== undefined) {
        connection.close()
      }
    } catch (e) {
      console.error(e)
    }
  }

  processTrack (sid: string): void {
    const track = this.trackBySid.get(sid)
    if (track === undefined) return
    if (this.connectionBySid.has(sid)) return

    const stream = new AudioStream(track, 16000)
    const ws = new WebSocket('wss://api.openai.com/v1/realtime?intent=transcription', {
      headers: {
        Authorization: 'Bearer ' + config.OpenaiApiKey,
        'OpenAI-Beta': 'realtime=v1',
        'User-Agent': 'LiveKit-Agents'
      }
    })
    console.log('Starting openai transcription for track', this.room.name, sid)

    this.streamBySid.set(sid, stream)
    this.connectionBySid.set(sid, ws)

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          type: 'transcription_session.update',
          session: {
            input_audio_format: 'pcm16',
            input_audio_transcription: {
              model: config.OpenAiTranscriptModel,
              prompt,
              language: config.OpenaiProvideLanguage ? (this.language ?? 'en') : undefined
            },
            turn_detection: {
              type: 'server_vad',
              threshold: config.VadThreshold,
              prefix_padding_ms: config.VadPrefixPaddingMs,
              silence_duration_ms: config.VadSilenceDurationMs
            },
            include: ['item.input_audio_transcription.logprobs']
          }
        })
      )
    })

    ws.on('message', (message: any) => {
      this.handleWsMessage(sid, message)
    })

    ws.on('close', () => {
      console.log('Connection closing...')
      const session = this.sessionBySid.get(sid)
      this.stopWs(sid)
      if (session !== undefined) {
        console.log('Session expired, recreating connection...')
        this.processTrack(sid)
      }
    })

    ws.on('error', (err: any) => {
      console.error(err)
    })

    void this.streamToOpenai(sid, stream)
  }

  private handleWsMessage (sid: string, message: any): void {
    try {
      const data = JSON.parse(message.toString())
      switch (data.type) {
        case 'transcription_session.created':
          this.onSessionCreated(sid, data)
          break
        case 'transcription_session.updated':
          console.log('session updated', data)
          break
        case 'error':
          console.error(data)
          break
        case 'conversation.item.input_audio_transcription.completed':
          this.onTranscriptCompleted(sid, data)
          break
      }
    } catch (e) {
      console.error(e)
    }
  }

  private onTranscriptCompleted (sid: string, data: any): void {
    if (data.transcript == null || data.transcript.trim() === '') return
    const logprobs: number[] =
      data.logprobs != null && Array.isArray(data.logprobs) ? data.logprobs.map((lp: any) => lp.logprob) : []
    const probability = getAvgProbability(logprobs)
    const perplexity = getPerplexity(logprobs)

    const result = probability !== undefined ? `${data.transcript} (${probability}, ${perplexity})` : data.transcript

    void this.sendToPlatform(result, sid)
  }

  private onSessionCreated (sid: string, data: any): void {
    const session: Session = {
      expireAt: data.session.expires_at * 1000
    }

    console.log('Session created', data)
    this.sessionBySid.set(sid, session)
  }

  async streamToOpenai (sid: string, stream: AudioStream): Promise<void> {
    for await (const frame of stream) {
      if (!this.isInProgress) continue
      const ws = this.connectionBySid.get(sid)
      if (ws === undefined) {
        stream.close()
        return
      }
      if (ws.readyState !== WebSocket.OPEN) continue
      const buf = Buffer.from(frame.data.buffer)
      ws.send(
        JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: buf.toString('base64')
        })
      )
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
    for (const sid of this.connectionBySid.keys()) {
      this.stopWs(sid)
    }
  }
}

function getAvgProbability (logprobs: number[]): string {
  const avgLogProb = logprobs.reduce((acc, lp) => acc + lp, 0) / logprobs.length
  return Math.exp(avgLogProb).toFixed(2)
}

function getPerplexity (logprobs: number[]): string {
  const avgLogProb = logprobs.reduce((acc, lp) => acc + lp, 0) / logprobs.length
  return Math.exp(-avgLogProb).toFixed(2)
}
