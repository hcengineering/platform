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

export class Recorder {
  private readonly mediaRecorder: MediaRecorder
  private readonly chunkStream: ChunkReader
  private readonly mediaStream: MediaStream

  constructor (mediaStream: MediaStream) {
    const supportedTypes = getSupportedMimeTypes()
    if (supportedTypes.length === 0) {
      throw new Error('video recording is not supported')
    }
    const mimeType = supportedTypes[0]
    this.mediaStream = mediaStream
    this.chunkStream = new ChunkReader()
    this.mediaRecorder = new MediaRecorder(mediaStream, { mimeType })
    this.mediaRecorder.ondataavailable = async (e) => {
      this.chunkStream.push(e.data)
    }
    this.mediaRecorder.onstop = () => {
      this.chunkStream.close()
    }
    this.mediaRecorder.onerror = (ev) => {
      this.chunkStream.close()
    }
  }

  public getMediaRecorderState (): RecordingState {
    return this.mediaRecorder.state
  }

  public start (): void {
    const readIntervalMs = 200
    this.mediaRecorder.start(readIntervalMs)
  }

  public resume (): void {
    this.mediaRecorder.resume()
  }

  public asStream (): ChunkReader {
    return this.chunkStream
  }

  public stop (): void {
    for (const track of this.mediaStream.getTracks()) {
      track.stop()
    }
    this.mediaRecorder.stop()
  }

  public pause (): void {
    this.mediaRecorder.pause()
  }
}

function getSupportedMimeTypes (): string[] {
  const videoTypes = ['mp4', 'webm', 'ogg', 'x-matroska']
  const videoCodecs = [
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

  const supportedTypes: string[] = []
  videoTypes.forEach((videoType) => {
    const type = `video/${videoType}`
    videoCodecs.forEach((codec) => {
      const variations = [
        `${type}codecs=${codec}`,
        `${type}codecs:${codec}`,
        `${type}codecs=${codec.toUpperCase()}`,
        `${type}codecs:${codec.toUpperCase()}`,
        `${type}`
      ]
      for (const variation of variations) {
        if (MediaRecorder.isTypeSupported(variation)) {
          supportedTypes.push(variation)
          break
        }
      }
    })
  })
  return supportedTypes
}
