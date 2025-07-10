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
import { EncodingOptions, EncodingOptionsPreset } from 'livekit-server-sdk'

export interface RecordingPreset {
  name: string
  width: number
  height: number
  preset: EncodingOptions | EncodingOptionsPreset
}

export const RecordingPreset720p: RecordingPreset = {
  name: '720p',
  width: 1280,
  height: 720,
  preset: EncodingOptionsPreset.H264_720P_30
}

export const RecordingPreset1080p: RecordingPreset = {
  name: '1080p',
  width: 1920,
  height: 1080,
  preset: EncodingOptionsPreset.H264_1080P_30
}

export function getRecordingPreset (name: string | undefined): RecordingPreset {
  switch (name) {
    case RecordingPreset1080p.name:
      return RecordingPreset1080p
    case RecordingPreset720p.name:
      return RecordingPreset720p
    default:
      return RecordingPreset720p
  }
}
