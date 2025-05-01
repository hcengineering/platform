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

import type TypedEmitter from 'typed-emitter'
import { CamState, MediaState, MicState } from './utils'

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MediaSessionEvents = {
  camera: (enabled: boolean) => void
  microphone: (enabled: boolean) => void
  feature: (feature: string, enabled: boolean) => void

  'selected-camera': (deviceId: string) => void
  'selected-microphone': (deviceId: string) => void
  'selected-speaker': (deviceId: string) => void

  update: (state: MediaState) => void
}

export interface MediaSession extends TypedEmitter<MediaSessionEvents> {
  readonly state: MediaState

  /**
   * Enable or disable camera
   */
  setCamera: (state: CamState | undefined) => void

  /**
   * Enable or disable microphone
   */
  setMicrophone: (state: MicState | undefined) => void

  /**
   * Enable or disable media feature
   */
  setFeature: (feature: string, state: any) => void

  close: () => void
}
