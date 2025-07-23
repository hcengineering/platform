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

import { getDisplayMedia, getSelectedCamId, getSelectedMicId, releaseStream } from '@hcengineering/media'
import { type Readable, derived, get, readable, writable } from 'svelte/store'

import { type CameraPosition, type CameraSize } from '../types'
import {
  getRecordingCameraPosition,
  getRecordingCameraSize,
  getRecordingResolution,
  getUseScreenShareSound,
  setRecordingCameraPosition,
  setRecordingCameraSize,
  setRecordingResolution,
  setUseScreenShareSound,
  whenStreamEnded
} from '../utils'
import { DefaultOptions } from '../const'

export interface RecorderConfig {
  useScreenShareSound: boolean
  recordingResolution: number
  recordingCameraSize: CameraSize
  recordingCameraPosition: CameraPosition
}

export interface RecorderState {
  camEnabled: boolean
  micEnabled: boolean
  camDeviceId: string | undefined
  micDeviceId: string | undefined

  loading: boolean
  camStream: MediaStream | null
  micStream: MediaStream | null
  screenStream: MediaStream | null
}

export type RecorderStore = RecorderConfig & RecorderState

export interface RecorderMethods {
  initialize: () => void
  toggleCam: () => void
  toggleMic: () => void
  setCamEnabled: (enabled: boolean) => void
  setMicEnabled: (enabled: boolean) => void
  setCamDeviceId: (camDeviceId: string | undefined) => void
  setMicDeviceId: (micDeviceId: string | undefined) => void

  setUseScreenShareSound: (useScreenShareSound: boolean) => void
  setRecordingResolution: (resolution: number) => void
  setRecordingCameraSize: (size: CameraSize) => void
  setRecordingCameraPosition: (pos: CameraPosition) => void

  shareScreen: () => Promise<void>
  stopScreenShare: () => Promise<void>

  cleanup: () => void
}

function createRecorderStore (): Readable<RecorderStore> & RecorderMethods {
  const $config = writable<RecorderConfig>({
    useScreenShareSound: getUseScreenShareSound(),
    recordingResolution: getRecordingResolution(),
    recordingCameraSize: getRecordingCameraSize(),
    recordingCameraPosition: getRecordingCameraPosition()
  })

  const $state = writable<RecorderState>({
    camEnabled: true,
    micEnabled: true,
    camDeviceId: undefined,
    micDeviceId: undefined,

    loading: false,
    camStream: null,
    micStream: null,
    screenStream: null
  })

  const $combined = derived([$config, $state], ([$config, $state]) => ({ ...$config, ...$state }))

  const store = {
    subscribe: $combined.subscribe,

    initialize (): void {
      const camDeviceId = getSelectedCamId()
      const micDeviceId = getSelectedMicId()
      const useScreenShareSound = getUseScreenShareSound()
      const recordingResolution = getRecordingResolution()
      const recordingCameraSize = getRecordingCameraSize()
      const recordingCameraPosition = getRecordingCameraPosition()

      $config.update((config) => ({
        ...config,
        useScreenShareSound,
        recordingResolution,
        recordingCameraSize,
        recordingCameraPosition
      }))

      $state.update((state) => ({
        ...state,
        camEnabled: true,
        micEnabled: true,
        camDeviceId,
        micDeviceId,

        loading: false,
        camStream: null,
        micStream: null,
        screenStream: null
      }))

      void updateMediaStreams()
    },

    toggleCam (): void {
      $state.update((state) => ({
        ...state,
        camEnabled: !state.camEnabled
      }))

      void updateMediaStreams()
    },

    toggleMic (): void {
      $state.update((state) => ({
        ...state,
        micEnabled: !state.micEnabled
      }))

      void updateMediaStreams()
    },

    setCamEnabled (enabled: boolean): void {
      $state.update((state) => ({
        ...state,
        camEnabled: enabled
      }))

      void updateMediaStreams()
    },

    setMicEnabled (enabled: boolean): void {
      $state.update((state) => ({
        ...state,
        micEnabled: enabled
      }))

      void updateMediaStreams()
    },

    setCamDeviceId (camDeviceId: string | undefined): void {
      $state.update((state) => ({
        ...state,
        camDeviceId
      }))

      void updateMediaStreams()
    },

    setMicDeviceId (micDeviceId: string | undefined): void {
      $state.update((state) => ({
        ...state,
        micDeviceId
      }))

      void updateMediaStreams()
    },

    setUseScreenShareSound (useScreenShareSound: boolean): void {
      setUseScreenShareSound(useScreenShareSound)
      $config.update((config) => ({
        ...config,
        useScreenShareSound
      }))
    },

    setRecordingResolution (resolution: number): void {
      setRecordingResolution(resolution)
      $config.update((config) => ({
        ...config,
        recordingResolution: resolution
      }))
    },

    setRecordingCameraSize (size: CameraSize): void {
      setRecordingCameraSize(size)
      $config.update((config) => ({
        ...config,
        recordingCameraSize: size
      }))
    },

    setRecordingCameraPosition (pos: CameraPosition): void {
      setRecordingCameraPosition(pos)
      $config.update((config) => ({
        ...config,
        recordingCameraPosition: pos
      }))
    },

    async shareScreen (): Promise<void> {
      const state = get($state)
      const config = get($config)
      const oldScreenStream = state.screenStream

      try {
        const stream = await getDisplayMedia({
          video: {
            frameRate: { ideal: DefaultOptions.fps }
          },
          audio: config.useScreenShareSound
        })

        $state.update((state) => ({
          ...state,
          screenStream: stream
        }))

        whenStreamEnded(stream, () => {
          $state.update((state) => ({
            ...state,
            screenStream: null
          }))
        })

        releaseStream(oldScreenStream)
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          console.debug('User denied screen capture permission', err)
        } else {
          console.error('Failed to get display media', err)
        }
      }
    },

    async stopScreenShare (): Promise<void> {
      const state = get($state)

      releaseStream(state.screenStream)

      $state.update((state) => ({
        ...state,
        screenStream: null
      }))
    },

    cleanup (): void {
      // Cancel any pending media stream updates
      requestVersion++

      $state.update((state) => {
        releaseStream(state.camStream)
        releaseStream(state.micStream)
        releaseStream(state.screenStream)

        return {
          ...state,
          camEnabled: false,
          micEnabled: false,
          camDeviceId: undefined,
          micDeviceId: undefined,
          camStream: null,
          micStream: null,
          screenStream: null
        }
      })
    }
  }

  let requestVersion = 0
  let currentRequest: Promise<void> = Promise.resolve()

  const updateMediaStreams = async (): Promise<void> => {
    const currentVersion = ++requestVersion

    // Wait for the previous request to complete
    await currentRequest.catch(() => {
      console.warn('previous media stream update failed')
    })

    const state = get($state)
    const config = get($config)
    const oldCamStream = state.camStream
    const oldMicStream = state.micStream

    $state.update((state) => ({
      ...state,
      loading: true
    }))

    const doUpdate = async (): Promise<void> => {
      if (requestVersion !== currentVersion) {
        return
      }

      try {
        const { camStream, micStream } = await getCombinedStream(
          state.camEnabled,
          state.micEnabled,
          state.camDeviceId,
          state.micDeviceId,
          state.screenStream == null ? undefined : config.recordingResolution
        )

        // Check if the request is still valid
        if (requestVersion !== currentVersion) {
          releaseStream(camStream)
          releaseStream(micStream)
          return
        }

        $state.update((state) => ({
          ...state,
          camStream,
          micStream,
          loading: false
        }))

        releaseStream(oldCamStream)
        releaseStream(oldMicStream)
      } catch (error) {
        console.error('Failed to get user media:', error)
      }
    }

    currentRequest = doUpdate()

    await currentRequest
  }

  window.addEventListener('beforeunload', () => {
    const { camStream, micStream, screenStream } = get($state)
    releaseStream(camStream)
    releaseStream(micStream)
    releaseStream(screenStream)
  })

  return store
}

export const recorder = createRecorderStore()

export const camEnabled = derived(recorder, ($recorder) => $recorder.camEnabled)
export const micEnabled = derived(recorder, ($recorder) => $recorder.micEnabled)
export const camDeviceId = derived(recorder, ($recorder) => $recorder.camDeviceId)
export const micDeviceId = derived(recorder, ($recorder) => $recorder.micDeviceId)

export const loading = derived(recorder, ($recorder) => $recorder.loading)
export const camStream = derived(recorder, ($recorder) => $recorder.camStream)
export const micStream = derived(recorder, ($recorder) => $recorder.micStream)
export const screenStream = derived(recorder, ($recorder) => $recorder.screenStream)

export const canShareScreen = readable(false, (set) => {
  set(navigator?.mediaDevices?.getDisplayMedia != null)
})

async function getCombinedStream (
  camEnabled: boolean,
  micEnabled: boolean,
  camDeviceId: string | undefined,
  micDeviceId: string | undefined,
  videoRes: number | undefined
): Promise<{ camStream: MediaStream | null, micStream: MediaStream | null }> {
  if (navigator?.mediaDevices === undefined) {
    console.warn('mediaDevices API not available')
    return { camStream: null, micStream: null }
  }

  if (!camEnabled && !micEnabled) {
    return { camStream: null, micStream: null }
  }

  const constraints = {
    video: camEnabled
      ? {
          deviceId: camDeviceId != null ? { exact: camDeviceId } : undefined,
          facingMode: 'user',
          aspectRatio: { ideal: 16 / 9 },
          height: videoRes !== undefined ? { ideal: videoRes } : undefined
        }
      : false,
    audio: micEnabled
      ? {
          deviceId: micDeviceId != null ? { exact: micDeviceId } : undefined
        }
      : false
  }

  try {
    const combinedStream = await navigator.mediaDevices.getUserMedia(constraints)

    // Split the combined stream into separate video and audio streams
    const camStream = camEnabled ? new MediaStream(combinedStream.getVideoTracks()) : null
    const micStream = micEnabled ? new MediaStream(combinedStream.getAudioTracks()) : null

    return { camStream, micStream }
  } catch (err) {
    console.error('Error getting media stream:', err)
    throw err
  }
}
