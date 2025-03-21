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

import plugin from '@hcengineering/recorder'
import { Recorder } from './recorder'
import { TusUploader, type Uploader, type Options } from './uploader'
import { getMetadata } from '@hcengineering/platform'

export class ScreenRecorder {
  private readonly recorder: Recorder
  private readonly uploader: Uploader

  constructor (recorder: Recorder, uploader: Uploader) {
    this.recorder = recorder
    this.uploader = uploader
  }

  static async fromNavigatorMediaDevices (opts: Options): Promise<ScreenRecorder> {
    let width = 0
    let height = 0
    const combinedStream = new MediaStream()
    const getMediaStream =
      getMetadata(plugin.metadata.GetCustomMediaStream) ??
      (async (op) => await navigator.mediaDevices.getDisplayMedia(op))
    const displayStream = await getMediaStream({
      video: { frameRate: opts.fps ?? 30 }
    })
    try {
      const microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      microphoneStream.getAudioTracks().forEach((track) => {
        combinedStream.addTrack(track)
      })
    } catch (err) {
      console.warn('microphone is disabled', err)
    }
    displayStream.getVideoTracks().forEach((track) => {
      combinedStream.addTrack(track)
      width = Math.max(track.getSettings().width ?? width, width)
      height = Math.max(track.getSettings().height ?? height, height)
    })
    displayStream.getAudioTracks().forEach((track) => {
      combinedStream.addTrack(track)
    })

    const recorder = new Recorder(combinedStream)
    const uploader = new TusUploader(recorder.asStream(), { ...opts, metadata: { resolution: width + ':' + height } })

    return new ScreenRecorder(recorder, uploader)
  }

  public start (): void {
    this.uploader.start()
    this.recorder.start()
  }

  public pause (): void {
    this.recorder.pause()
  }

  public resume (): void {
    this.recorder.resume()
  }

  public async stop (): Promise<void> {
    this.recorder.stop()
    await this.uploader.wait()
  }

  public async cancel (): Promise<void> {
    this.recorder.stop()
    await this.uploader.cancel()
  }
}
