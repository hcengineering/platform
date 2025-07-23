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

import { type Blob as PlatformBlob, type Ref } from '@hcengineering/core'
import { showPopup } from '@hcengineering/ui'
import { type FileUploadOptions } from '@hcengineering/uploader'

import { recorder } from './stores/recorder'
import { recording } from './stores/recording'
import { type RecordingOptions, type RecordingResult } from './types'

import RecordingPopup from './components/RecordingPopup.svelte'

export function recordingPopupClosed (): void {
  recorder.cleanup()
}

export function recordingPopupOpened (): void {
  recorder.initialize()
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

export async function shareScreen (): Promise<void> {
  await recorder.shareScreen()
}

export async function stopScreenShare (): Promise<void> {
  await recorder.stopScreenShare()
}

export async function record ({ onFileUploaded }: FileUploadOptions): Promise<void> {
  const onSuccess = async (result: RecordingResult): Promise<void> => {
    const file = new Blob([], { type: result.type })
    await onFileUploaded?.({
      uuid: result.uuid as Ref<PlatformBlob>,
      name: result.name,
      file,
      metadata: {
        width: result.width,
        height: result.height
      }
    })
  }
  showPopup(RecordingPopup, { onSuccess }, 'centered')
}

export async function startRecording (options: RecordingOptions): Promise<void> {
  await recording.start(options)
}

export async function stopRecording (): Promise<void> {
  await recording.stop()
}

export async function pauseRecording (): Promise<void> {
  await recording.pause()
}

export async function resumeRecording (): Promise<void> {
  await recording.resume()
}

export async function cancelRecording (): Promise<void> {
  await recording.cancel()
}
