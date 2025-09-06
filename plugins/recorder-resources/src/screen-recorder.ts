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

import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'

import { DefaultAudioBps, DefaultChunkIntervalMs, DefaultVideoBps } from './const'
import { Recorder } from './recorder'
import { type RecordingResult } from './types'
import { type Uploader, TusUploader } from './uploader'
import { getVideoDimensions } from './utils'

import plugin from './plugin'

export interface ScreenRecorderOptions {
  audioBps?: number
  videoBps?: number
  videoRes?: 720 | 1080 | 1440 | 2160 | number
  chunkIntervalMs?: number
}

export async function createScreenRecorder (
  stream: MediaStream,
  options: ScreenRecorderOptions = {}
): Promise<ScreenRecorder> {
  const audioBps = options.audioBps ?? DefaultAudioBps
  const videoBps = options.videoBps ?? DefaultVideoBps
  const chunkIntervalMs = options.chunkIntervalMs ?? DefaultChunkIntervalMs

  const { width, height } = await getVideoDimensions(stream)

  const token = getMetadata(presentation.metadata.Token) ?? ''
  const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
  const endpoint = getMetadata(plugin.metadata.StreamUrl) ?? ''

  const recorder = new Recorder(stream, { chunkIntervalMs, audioBps, videoBps })
  const contentType = recorder.mimeType
  const uploader = new TusUploader(recorder.asStream(), {
    token,
    workspace,
    endpoint,
    width,
    height,
    contentType
  })
  return new ScreenRecorder(stream, recorder, uploader)
}

export class ScreenRecorder {
  constructor (
    readonly stream: MediaStream,
    private readonly recorder: Recorder,
    private readonly uploader: Uploader
  ) {}

  get elapsedTime (): number {
    return this.recorder.getRecordedTimeMs()
  }

  public async start (): Promise<void> {
    this.uploader.start()
    this.recorder.start()
  }

  public async pause (): Promise<void> {
    this.recorder.pause()
  }

  public async resume (): Promise<void> {
    this.recorder.resume()
  }

  public async stop (): Promise<RecordingResult> {
    await this.recorder.stop()
    return await this.uploader.wait()
  }

  public async cancel (): Promise<void> {
    await this.recorder.stop()
    await this.uploader.cancel()
  }
}
