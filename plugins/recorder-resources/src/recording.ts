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

import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { showPopup } from '@hcengineering/ui'
import { type FileUploadOptions } from '@hcengineering/uploader'
import { get } from 'svelte/store'

import Recorder from './components/Recorder.svelte'
import plugin from './plugin'
import { recorder, recording } from './stores'
import { createScreenRecorder } from './screen-recorder'

export function record (options: FileUploadOptions): void {
  const current = get(recorder)
  if (current !== null) return

  const { onFileUploaded } = options

  const popup = showPopup(
    Recorder,
    {
      onFileUploaded
    },
    undefined,
    () => {
      recorder.set(null)
    },
    undefined,
    {
      category: 'control',
      overlay: false,
      fixed: true
    }
  )

  recorder.set(popup)
}

export interface RecordingOptions {
  cameraStream: MediaStream | null
  microphoneStream: MediaStream | null
  fps?: number
  onSuccess?: (uploadId: string) => Promise<void>
  onError?: (uploadId: string) => void
}

export async function startRecording (options: RecordingOptions): Promise<void> {
  const current = get(recording)
  if (current !== null) {
    console.warn('Recording already started', current)
    return
  }

  const { cameraStream, microphoneStream, fps } = options

  let displayStream: MediaStream
  try {
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: fps ?? 30 }
      }
    })
    for (const track of displayStream.getVideoTracks()) {
      track.onended = () => {
        void stopRecording()
      }
    }
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      console.debug('User denied screen capture permission', err)
    } else {
      console.error('Failed to get display media', err)
    }
    return
  }

  const mediaStream = makeCombinedStream(displayStream, cameraStream, microphoneStream)

  const token = getMetadata(presentation.metadata.Token) ?? ''
  const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
  const endpoint = getMetadata(plugin.metadata.StreamUrl) ?? ''

  let width = 0
  let height = 0

  mediaStream.getVideoTracks().forEach((track) => {
    width = Math.max(track.getSettings().width ?? width, width)
    height = Math.max(track.getSettings().height ?? height, height)
  })

  // Callback invoked when upload succeeds, passing blobId
  const onSuccess = (blobId: string): void => {
    console.debug('Recording upload success', { blobId })
    void options.onSuccess?.(blobId)
  }

  // Callback invoked when upload fails, passing error
  const onError = (error: any): void => {
    console.error('Recording upload failed', error)
    options.onError?.(error)
  }

  const recorder = createScreenRecorder(mediaStream, { token, endpoint, workspace, width, height, onSuccess, onError })
  await recorder.start()
  recording.set({ recorder, stream: recorder.stream, state: 'recording' })
}

export async function stopRecording (): Promise<void> {
  const current = get(recording)
  if (current !== null && current.state === 'recording') {
    recording.set({ ...current, state: 'stopped' })
    await current.recorder.stop()
    recording.set(null)
    get(recorder)?.close()
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
    console.warn('Recording is not in `paused` state', current)
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

function makeCombinedStream (
  screenStream: MediaStream,
  cameraStream: MediaStream | null,
  microphoneStream: MediaStream | null
): MediaStream {
  const tracks: MediaStreamTrack[] = []

  // Add screen tracks
  tracks.push(...screenStream.getTracks())

  if (cameraStream != null && cameraStream.getVideoTracks().length > 0) {
    // Don't add camera video to the recording, it will just be displayed
    // in picture-in-picture style via UI
  }

  if (cameraStream != null && cameraStream.getAudioTracks().length > 0) {
    tracks.push(...cameraStream.getAudioTracks())
  }

  if (microphoneStream != null && microphoneStream.getAudioTracks().length > 0) {
    tracks.push(...microphoneStream.getAudioTracks())
  }

  return new MediaStream(tracks)
}
