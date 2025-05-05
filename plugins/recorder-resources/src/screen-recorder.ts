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

import { Recorder } from './recorder'
import { type Uploader, type TusUploaderOptions, TusUploader } from './uploader'

export function createScreenRecorder (mediaStream: MediaStream, options: TusUploaderOptions): ScreenRecorder {
  const recorder = new Recorder({ mediaStream })
  const uploader = new TusUploader(recorder.asStream(), options)

  return new ScreenRecorder(mediaStream, recorder, uploader)
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

  public async stop (): Promise<void> {
    this.recorder.stop()
    await this.uploader.wait()
  }

  public async cancel (): Promise<void> {
    this.recorder.stop()
    await this.uploader.cancel()
  }
}
