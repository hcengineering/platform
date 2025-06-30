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
import { get } from 'svelte/store'

import RecordingPopup from './components/RecordingPopup.svelte'
import { recorder, recording } from './stores'
import { createScreenRecorder } from './screen-recorder'
import { type RecordingOptions, type RecordingResult } from './types'

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
  const current = get(recording)
  if (current !== null) {
    throw new Error('Recording already started')
  }

  const recorder = await createScreenRecorder(options)
  await recorder.start()

  recording.set({ recorder, options, stream: options.stream, state: 'recording' })
}

export async function stopRecording (): Promise<void> {
  const current = get(recording)
  const popup = get(recorder)
  if (current !== null && current.state === 'recording') {
    recording.set({ ...current, state: 'stopping' })
    const result = await current.recorder.stop()
    await current.options.onSuccess?.(result)

    recording.set({ ...current, state: 'stopped' })
    popup?.close()
  } else {
    console.warn('Recording is not in `recording` state', current)
  }
}

export async function pauseRecording (): Promise<void> {
  const current = get(recording)
  if (current !== null && current.state === 'recording') {
    await current.recorder.pause()
    recording.set({ ...current, state: 'paused' })
  } else {
    console.warn('Recording is not in `recording` state', current)
  }
}

export async function restartRecording (): Promise<void> {
  const current = get(recording)
  if (current !== null) {
    await current.recorder.cancel()
    await current.recorder.start()
    recording.set({ ...current, state: 'recording' })
  } else {
    console.warn('Recording not started', current)
  }
}

export async function resumeRecording (): Promise<void> {
  const current = get(recording)
  if (current !== null && current.state === 'paused') {
    await current.recorder.resume()
    recording.set({ ...current, state: 'recording' })
  } else {
    console.warn('Recording is not in `paused` state', current)
  }
}

export async function cancelRecording (): Promise<void> {
  const current = get(recording)
  if (current !== null) {
    await current.recorder.cancel()
    recording.set(null)
  }
}
