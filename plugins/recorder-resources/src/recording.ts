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

import { type PopupResult, showPopup } from '@hcengineering/ui'
import { type FileUploadCallback, type FileUploadOptions } from '@hcengineering/uploader'
import { derived, get, writable } from 'svelte/store'

import RecordingPopup from './components/RecordingPopup.svelte'

import { composer } from './stores/composer'
import { manager } from './stores/manager'
import { recorder } from './stores/recorder'

import type { CameraPosition, CameraSize } from './types'

export {
  camEnabled,
  micEnabled,
  camDeviceId,
  micDeviceId,
  loading,
  camStream,
  micStream,
  screenStream,
  canShareScreen,
  recordingCameraPosition,
  recordingCameraSize,
  useScreenShareSound
} from './stores/manager'

export { recorder } from './stores/recorder'

export async function record ({ onFileUploaded }: FileUploadOptions): Promise<void> {
  await recorder.initialize()
  showRecordingPopup(onFileUploaded)
}

export function toggleCam (): void {
  recorder.toggleCam()
}

export function toggleMic (): void {
  recorder.toggleMic()
}

export function setCam (deviceId: string | undefined): void {
  recorder.setCamDeviceId(deviceId)
}

export function setMic (deviceId: string | undefined): void {
  recorder.setMicDeviceId(deviceId)
}

export async function startScreenShare (): Promise<void> {
  await recorder.startScreenShare()
}

export async function stopScreenShare (): Promise<void> {
  await recorder.stopScreenShare()
}

export function setCameraPosition (cameraPos: CameraPosition): void {
  manager.setRecordingCameraPosition(cameraPos)
  composer.updateConfig({ cameraPos })
}

export function setCameraSize (cameraSize: CameraSize): void {
  manager.setRecordingCameraSize(cameraSize)
  composer.updateConfig({ cameraSize })
}

export function setUseScreenShareSound (useScreenShareSound: boolean): void {
  manager.setUseScreenShareSound(useScreenShareSound)
}

const recordingPopup = writable<PopupResult | null>(null)

export function recordingPopupOpened (): void {
  // TODO
}

export function recordingPopupClosed (): void {
  void cancelRecording()
}

export function showRecordingPopup (onFileUploaded: FileUploadCallback | undefined): void {
  const current = get(recordingPopup)
  if (current === null) {
    const result = showPopup(RecordingPopup, { onFileUploaded }, 'centered', () => {
      console.log('Recording popup closed')
      recordingPopup.set(null)
    })
    recordingPopup.set(result)
  }
}

export function closeRecordingPopup (): void {
  const popup = get(recordingPopup)
  popup?.close()
}

export async function startRecording (): Promise<void> {
  const state = get(manager)
  if (state.screenStream !== null) {
    closeRecordingPopup()

    // Wait for the popup to close before recording
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 250)
    })
  }

  await recorder.start()
}

export async function stopRecording (): Promise<void> {
  await recorder.stop()
  showRecordingPopup(undefined)
}

export async function pauseRecording (): Promise<void> {
  await recorder.pause()
}

export async function resumeRecording (): Promise<void> {
  await recorder.resume()
}

export async function cancelRecording (): Promise<void> {
  await recorder.cleanup()
}

export const recorderState = derived(recorder, ($recorder) => $recorder)
