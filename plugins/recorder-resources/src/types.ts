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

export type CameraSize = 'small' | 'medium' | 'large'
export type CameraPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface RecordingOptions {
  stream: MediaStream

  fps?: number
  audioBps?: number
  videoBps?: number
  videoRes?: 720 | 1080 | 1440 | 2160 | number
  chunkIntervalMs?: number
}

export interface RecordingResult {
  uuid: string
  type: string
  size: number
  width: number
  height: number
}
