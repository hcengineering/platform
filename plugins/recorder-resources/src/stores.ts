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

import { type PopupResult } from '@hcengineering/ui'
import { writable } from 'svelte/store'
import { DefaultOptions } from './const'
import { type CameraPosition, type CameraSize, type RecordingState } from './types'
import {
  getRecordingCameraPosition,
  getRecordingCameraSize,
  getRecordingResolution,
  getUseScreenShareSound,
  setRecordingCameraPosition,
  setRecordingCameraSize,
  setRecordingResolution,
  setUseScreenShareSound
} from './utils'

export const recorder = writable<PopupResult | null>(null)
export const recording = writable<RecordingState | null>(null)

export const useScreenShareSound = writable(false, (set) => {
  set(getUseScreenShareSound())
})

export const recordingResolution = writable(DefaultOptions.videoRes, (set) => {
  set(getRecordingResolution())
})

export const recordingCameraSize = writable<CameraSize>('medium', (set) => {
  set(getRecordingCameraSize())
})

export const recordingCameraPosition = writable<CameraPosition>('bottom-left', (set) => {
  set(getRecordingCameraPosition())
})

useScreenShareSound.subscribe(setUseScreenShareSound)
recordingResolution.subscribe(setRecordingResolution)
recordingCameraSize.subscribe(setRecordingCameraSize)
recordingCameraPosition.subscribe(setRecordingCameraPosition)
