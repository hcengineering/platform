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

const chunkIntervalMs = 1000

export interface RecorderOptions {
  mediaStream: MediaStream
}

export class Recorder {
  private readonly mediaRecorder: MediaRecorder
  private readonly chunkStream: ChunkReader
  private readonly mediaStream: MediaStream
  // Total elapsed recording time in milliseconds (excluding pauses)
  private elapsedMs: number = 0
  // Timestamp when recording or resuming started; null if paused or not started
  private lastStartTime: number | null = null

  constructor (options: RecorderOptions) {
    const { mediaStream } = options

    const supportedTypes = getSupportedMimeTypes()
    if (supportedTypes.length === 0) {
      throw new Error('Recorder: video recording is not supported')
    }

    const mimeType = supportedTypes[0]
    this.mediaStream = mediaStream
    this.chunkStream = new ChunkReader()
    this.mediaRecorder = new MediaRecorder(mediaStream, { mimeType })
    this.mediaRecorder.ondataavailable = async (e) => {
      this.chunkStream.push(e.data)
    }
    this.mediaRecorder.onstart = () => {
      console.debug('Recorder: MediaRecorder started', new Date().toISOString())
    }
    this.mediaRecorder.onstop = () => {
      console.debug('Recorder: MediaRecorder stopped', new Date().toISOString())
      this.chunkStream.close()
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
    this.mediaRecorder.start(chunkIntervalMs)
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
