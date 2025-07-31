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

import { type FileUploadCallback, type FileUploadTarget } from '@hcengineering/uploader'

import { type Readable, get, writable } from 'svelte/store'

import { type ScreenRecorder, createScreenRecorder } from '../screen-recorder'
import { composer } from '../stores/composer'
import { camStream, manager, screenStream } from '../stores/manager'
import type { RecordingResult } from '../types'
import { deleteFile } from '@hcengineering/presentation'

export type RecorderState = 'idle' | 'ready' | 'recording' | 'paused' | 'stopping' | 'stopped'

export interface RecorderConfig {
  onFileUploaded?: FileUploadCallback
  target?: FileUploadTarget
}

export interface RecorderStore {
  state: RecorderState
  config: RecorderConfig
  elapsedTime: number
  result: RecordingResult | null
}

export interface Recorder {
  initialize: (config: RecorderConfig) => Promise<void>
  cleanup: () => Promise<void>

  start: () => Promise<void>
  stop: () => Promise<void>
  cancel: () => Promise<void>

  pause: () => Promise<void>
  resume: () => Promise<void>

  toggleCam: () => void
  toggleMic: () => void
  setCamDeviceId: (deviceId: string | undefined) => void
  setMicDeviceId: (deviceId: string | undefined) => void

  startScreenShare: () => Promise<void>
  stopScreenShare: () => Promise<void>
}

function createRecorder (): Readable<RecorderStore> & Recorder {
  const store = writable<RecorderStore>({
    state: 'idle',
    config: {},
    elapsedTime: 0,
    result: null
  })

  let elapsedTimeInterval: number | undefined
  let screenRecorder: ScreenRecorder | null = null

  function updateStore (updates: Partial<RecorderStore>): void {
    store.update((current) => ({ ...current, ...updates }))
  }

  function startElapsedTimer (): void {
    if (elapsedTimeInterval !== undefined) return

    elapsedTimeInterval = window.setInterval(() => {
      const elapsedTime = screenRecorder?.elapsedTime ?? 0
      updateStore({ elapsedTime })
    }, 100)
  }

  function stopElapsedTimer (): void {
    clearInterval(elapsedTimeInterval)
    elapsedTimeInterval = undefined
  }

  camStream.subscribe(composer.updateCameraStream)
  screenStream.subscribe(composer.updateScreenStream)

  function onStreamEnded (): void {
    const { state } = get(store)

    if (state === 'recording') {
      void recorder.stop()
    }
  }

  manager.setCallbacks({
    onCamStreamEnded: onStreamEnded,
    onMicStreamEnded: onStreamEnded,
    onScreenStreamEnded: onStreamEnded
  })

  return {
    subscribe: store.subscribe,

    async initialize (config: RecorderConfig): Promise<void> {
      const { state } = get(store)

      if (state !== 'idle') {
        console.warn('Recorder is already initialized')
        return
      }

      manager.initialize()
      composer.initialize()

      updateStore({ state: 'ready', config })
    },

    async start (): Promise<void> {
      const { state } = get(store)

      if (state !== 'ready' && state !== 'stopped') {
        throw new Error(`Cannot start recording from state: ${state}`)
      }

      const { screenStream, micStream } = get(manager)
      const canvasStream = composer.getStream()
      const stream = combineStreams(canvasStream, micStream, screenStream)

      // Create and start screen recorder
      screenRecorder = await createScreenRecorder(stream)

      await screenRecorder.start()

      startElapsedTimer()
      updateStore({ state: 'recording' })
    },

    async stop (): Promise<void> {
      const { state } = get(store)

      if (state !== 'recording' && state !== 'paused') {
        throw new Error(`Cannot stop from state: ${state}`)
      }

      if (screenRecorder === null) {
        throw new Error('No active recording')
      }

      updateStore({ state: 'stopping' })
      stopElapsedTimer()

      const result = await screenRecorder.stop()
      updateStore({ state: 'stopped', result })

      manager.cleanup()
      composer.cleanup()

      screenRecorder = null
    },

    async pause (): Promise<void> {
      const { state } = get(store)
      if (state !== 'recording') {
        throw new Error(`Cannot pause from state: ${state}`)
      }

      if (screenRecorder === null) {
        throw new Error('No active recording')
      }

      await screenRecorder.pause()
      stopElapsedTimer()
      updateStore({ state: 'paused' })
    },

    async resume (): Promise<void> {
      const { state } = get(store)

      if (state !== 'paused') {
        throw new Error(`Cannot resume from state: ${state}`)
      }

      if (screenRecorder === null) {
        throw new Error('No active recording')
      }

      await screenRecorder.resume()
      startElapsedTimer()
      updateStore({ state: 'recording' })
    },

    async cancel (): Promise<void> {
      if (screenRecorder !== null) {
        await screenRecorder?.cancel()
        screenRecorder = null
      }

      const { result } = get(store)
      if (result !== null) {
        await deleteFile(result.uuid)
      }

      await this.cleanup()
    },

    async cleanup (): Promise<void> {
      if (screenRecorder !== null) {
        await screenRecorder?.cancel()
        screenRecorder = null
      }

      stopElapsedTimer()

      manager.cleanup()
      composer.cleanup()

      updateStore({
        state: 'idle',
        elapsedTime: 0,
        result: null
      })
    },

    toggleCam (): void {
      manager.toggleCam()
    },

    toggleMic (): void {
      manager.toggleMic()
    },

    setCamDeviceId (deviceId: string | undefined): void {
      manager.setCamDeviceId(deviceId)
    },

    setMicDeviceId (deviceId: string | undefined): void {
      manager.setMicDeviceId(deviceId)
    },

    async startScreenShare (): Promise<void> {
      await manager.shareScreen()
    },

    async stopScreenShare (): Promise<void> {
      await manager.stopScreenShare()
    }
  }
}

export const recorder = createRecorder()

function combineStreams (
  canvasStream: MediaStream | null,
  micStream: MediaStream | null,
  screenStream: MediaStream | null
): MediaStream {
  const tracks: MediaStreamTrack[] = []

  if (canvasStream !== null) {
    tracks.push(...canvasStream.getVideoTracks())
  }

  if (screenStream !== null) {
    tracks.push(...screenStream.getAudioTracks())
  }

  if (micStream !== null && micStream.getAudioTracks().length > 0) {
    tracks.push(...micStream.getAudioTracks())
  }

  return new MediaStream(tracks)
}
