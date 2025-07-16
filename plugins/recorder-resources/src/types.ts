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

import { type ScreenRecorder } from './screen-recorder'

export type CameraSize = 'small' | 'medium' | 'large'
export type CameraPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface RecordingState {
  recorder: ScreenRecorder
  options: RecordingOptions
  stream: MediaStream
  state: 'recording' | 'paused' | 'stopping' | 'stopped'
  result: RecordingResult | null
}

export interface RecordingOptions {
  name: string
  stream: MediaStream

  fps?: number
  audioBps?: number
  videoBps?: number
  videoRes?: 720 | 1080 | 1440 | 2160 | number
  chunkIntervalMs?: number
  cameraSize?: CameraSize

  onSuccess?: (result: RecordingResult) => Promise<void>
}

export interface RecordingResult {
  name: string
  uuid: string
  type: string
  width: number
  height: number
}
