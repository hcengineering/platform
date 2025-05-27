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

import { ChunkReader } from './stream'
import { formatElapsedTime } from './utils'

const chunkIntervalMs = 1000

export interface RecorderOptions {
  chunkIntervalMs?: number
  audioBps?: number
  videoBps?: number
}

export class Recorder {
  private readonly mediaRecorder: MediaRecorder
  private readonly chunkStream: ChunkReader
  private readonly chunkInterval: number
  // Total elapsed recording time in milliseconds (excluding pauses)
  private elapsedMs: number = 0
  // Timestamp when recording or resuming started; null if paused or not started
  private lastStartTime: number | null = null

  constructor (
    private readonly mediaStream: MediaStream,
    private readonly options: RecorderOptions
  ) {
    const supportedTypes = getSupportedMimeTypes()
    if (supportedTypes.length === 0) {
      throw new Error('Recorder: video recording is not supported')
    }

    this.chunkInterval = options.chunkIntervalMs ?? chunkIntervalMs
    this.chunkStream = new ChunkReader()

    this.mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: supportedTypes[0],
      audioBitsPerSecond: options.audioBps,
      videoBitsPerSecond: options.videoBps
    })

    this.mediaRecorder.ondataavailable = async (e) => {
      const kb = Math.floor(e.data.size / 1024)
      console.debug('Recorder: MediaRecorder data available', formatElapsedTime(e.timecode), `${kb}KB`)
      this.chunkStream.push(e.data)
    }
    this.mediaRecorder.onstart = () => {
      console.debug('Recorder: MediaRecorder started', new Date().toISOString())
    }
    this.mediaRecorder.onstop = () => {
      console.debug('Recorder: MediaRecorder stopped', new Date().toISOString())
      this.chunkStream.close()
    }
    this.mediaRecorder.onpause = () => {
      console.debug('Recorder: MediaRecorder paused', new Date().toISOString())
    }
    this.mediaRecorder.onresume = () => {
      console.debug('Recorder: MediaRecorder resumed', new Date().toISOString())
    }
    this.mediaRecorder.onerror = (ev) => {
      console.error('Recorder: MediaRecorder error:', ev)
      this.chunkStream.close()
    }
  }

  public getMediaRecorderState (): RecordingState {
    return this.mediaRecorder.state
  }

  public start (): void {
    this.elapsedMs = 0
    this.lastStartTime = Date.now()
    this.mediaRecorder.start(this.chunkInterval)
    console.debug('Recorder: recording started', new Date().toISOString())
  }

  public resume (): void {
    this.lastStartTime = Date.now()
    this.mediaRecorder.resume()
    console.debug('Recorder: recording resumed', new Date().toISOString())
  }

  public asStream (): ChunkReader {
    return this.chunkStream
  }

  public stop (): void {
    if (this.lastStartTime !== null) {
      this.elapsedMs += Date.now() - this.lastStartTime
      this.lastStartTime = null
    }

    try {
      this.mediaRecorder.stop()
    } catch (err) {
      console.error('Recorder: error stopping MediaRecorder:', err)
    } finally {
      for (const track of this.mediaStream.getTracks()) {
        track.stop()
      }
    }
    console.debug('Recorder: recording stopped, duration:', this.getRecordedTimeMs(), 'ms')
  }

  public pause (): void {
    if (this.lastStartTime !== null) {
      this.elapsedMs += Date.now() - this.lastStartTime
      this.lastStartTime = null
    }
    this.mediaRecorder.pause()
    console.debug('Recorder: recording paused, duration:', this.getRecordedTimeMs(), 'ms')
  }

  public getRecordedTimeMs (): number {
    return this.lastStartTime !== null ? this.elapsedMs + Date.now() - this.lastStartTime : this.elapsedMs
  }
}

function getSupportedMimeTypes (): string[] {
  const containers = ['mp4', 'webm', 'ogg', 'x-matroska']
  const codecs = [
    'vp9,opus',
    'vp8,opus',
    'vp9',
    'vp9.0',
    'vp8',
    'vp8.0',
    'h264',
    'h.264',
    'avc1',
    'av1',
    'h265',
    'h.265'
  ]

  const supported: string[] = []
  for (const container of containers) {
    const base = `video/${container}`
    for (const codec of codecs) {
      const mime = `${base};codecs="${codec}"`
      if (MediaRecorder.isTypeSupported(mime)) {
        supported.push(mime)
        break
      }
    }
    if (MediaRecorder.isTypeSupported(base)) {
      supported.push(base)
    }
  }
  return supported
}
