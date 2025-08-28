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

const selectedCamId = 'selectedDevice_cam'
const selectedMicId = 'selectedDevice_mic'
const selectedSpeakerId = 'selectedDevice_speaker'

export interface CamState {
  enabled: boolean
  track?: MediaStreamTrack
  deviceId?: string
}

export interface MicState {
  enabled: boolean
  track?: MediaStreamTrack
  deviceId?: string
}

export interface MediaState {
  camera?: CamState
  microphone?: MicState
  [key: string]: any
}

export interface MediaInfo {
  activeMicrophone: MediaDeviceInfo | undefined
  activeCamera: MediaDeviceInfo | undefined
  activeSpeaker: MediaDeviceInfo | undefined
  devices: MediaDeviceInfo[]
}

/** @public */
export function getSelectedCamId (): string | undefined {
  return localStorage.getItem(selectedCamId) ?? undefined
}

/** @public */
export function getSelectedMicId (): string | undefined {
  return localStorage.getItem(selectedMicId) ?? undefined
}

/** @public */
export function getSelectedSpeakerId (): string | undefined {
  return localStorage.getItem(selectedSpeakerId) ?? undefined
}

/** @public */
export function updateSelectedCamId (deviceId: string | undefined): void {
  if (deviceId !== undefined) {
    localStorage.setItem(selectedCamId, deviceId)
  } else {
    localStorage.removeItem(selectedCamId)
  }
}

/** @public */
export function updateSelectedMicId (deviceId: string | undefined): void {
  if (deviceId !== undefined) {
    localStorage.setItem(selectedMicId, deviceId)
  } else {
    localStorage.removeItem(selectedMicId)
  }
}

/** @public */
export function updateSelectedSpeakerId (deviceId: string | undefined): void {
  if (deviceId !== undefined) {
    localStorage.setItem(selectedSpeakerId, deviceId)
  } else {
    localStorage.removeItem(selectedSpeakerId)
  }
}

/** @public */
export async function getMediaDevices (microphone: boolean, camera: boolean): Promise<MediaInfo> {
  if (navigator?.mediaDevices === undefined) {
    console.warn('mediaDevices API not available')
    return { activeCamera: undefined, activeMicrophone: undefined, activeSpeaker: undefined, devices: [] }
  }

  let microphonePermission: PermissionStatus['state'] | undefined = microphone
    ? await getPermissionStatus('microphone')
    : undefined
  let cameraPermission: PermissionStatus['state'] | undefined = camera ? await getPermissionStatus('camera') : undefined
  let selectedMicrophoneId = getSelectedMicId()
  let selectedCameraId = getSelectedCamId()
  const selectedSpeakerId = getSelectedSpeakerId()
  let devices: MediaDeviceInfo[] = []

  // firefox returns 'granted' state, but returns empty deviceId, so we need to reask permissions
  if (microphonePermission === 'granted' || cameraPermission === 'granted') {
    devices = await enumerateDevices()
    if (devices.some((d) => d.deviceId === '')) {
      microphonePermission = microphonePermission === 'granted' ? 'prompt' : microphonePermission
      cameraPermission = cameraPermission === 'granted' ? 'prompt' : cameraPermission
    }
  }

  if (microphonePermission === 'prompt' || cameraPermission === 'prompt') {
    const askMicrophone = microphonePermission === 'prompt'
    const askCamera = cameraPermission === 'prompt'
    try {
      // ask missing permissions, prefer platform selected devices
      const stream = await navigator.mediaDevices.getUserMedia({
        ...(askMicrophone
          ? {
              audio:
                selectedMicrophoneId !== undefined && selectedMicrophoneId !== ''
                  ? { deviceId: { ideal: selectedMicrophoneId } }
                  : true
            }
          : undefined),
        ...(askCamera
          ? {
              video:
                selectedCameraId !== undefined && selectedCameraId !== ''
                  ? { deviceId: { ideal: selectedCameraId } }
                  : true
            }
          : undefined)
      })

      const tracks = stream.getTracks()
      if (askMicrophone) {
        selectedMicrophoneId = tracks.find((t) => t.kind === 'audio')?.getSettings().deviceId
      }
      if (askCamera) {
        selectedCameraId = tracks.find((t) => t.kind === 'video')?.getSettings().deviceId
      }

      releaseStream(stream)
    } catch (error) {
      if (askMicrophone) microphonePermission = 'denied'
      if (askCamera) cameraPermission = 'denied'
      console.log(error)
    }
  }
  devices = await enumerateDevices()

  const activeMicrophone =
    microphonePermission === 'denied' ? undefined : getActiveDevice('audioinput', devices, selectedMicrophoneId)
  updateSelectedMicId(activeMicrophone?.deviceId)
  const activeCamera =
    cameraPermission === 'denied' ? undefined : getActiveDevice('videoinput', devices, selectedCameraId)
  updateSelectedCamId(activeCamera?.deviceId)
  const activeSpeaker = getActiveDevice('audiooutput', devices, selectedSpeakerId)

  return { activeMicrophone, activeCamera, activeSpeaker, devices }
}

function getActiveDevice (
  kind: MediaDeviceKind,
  allDevices: MediaDeviceInfo[],
  deviceId?: string
): MediaDeviceInfo | undefined {
  const devices = allDevices.filter((d) => d.kind === kind)
  if (devices.length === 0) return undefined
  return devices.find((d) => d.deviceId === deviceId) ?? devices[0]
}

async function getPermissionStatus (name: 'microphone' | 'camera'): Promise<PermissionStatus['state']> {
  const status = await navigator.permissions.query({ name })
  return status.state
}

async function enumerateDevices (): Promise<MediaDeviceInfo[]> {
  if (navigator?.mediaDevices === undefined) {
    console.warn('mediaDevices API not available')
    return []
  }
  return await navigator.mediaDevices.enumerateDevices()
}

export function cleanupDeviceLabel (label: string): string {
  return (
    label
      // Remove hardware id suffix
      .replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)$/i, '')
      .trim()
  )
}

export async function getMediaStream (
  camDeviceId: MediaDeviceInfo['deviceId'] | undefined,
  micDeviceId: MediaDeviceInfo['deviceId'] | undefined,
  constraints?: MediaStreamConstraints
): Promise<MediaStream | null> {
  if (navigator?.mediaDevices === undefined) {
    console.warn('mediaDevices API not available')
    return null
  }

  let video: MediaTrackConstraints | boolean
  let audio: MediaTrackConstraints | boolean

  if (constraints?.video === undefined) {
    video = camDeviceId !== undefined ? { deviceId: { exact: camDeviceId } } : true
  } else if (constraints.video === true) {
    video = camDeviceId !== undefined ? { deviceId: { exact: camDeviceId } } : true
  } else if (constraints.video === false) {
    video = false
  } else {
    video = { ...constraints.video, deviceId: { exact: camDeviceId } }
  }

  if (constraints?.audio === undefined) {
    audio = micDeviceId !== undefined ? { deviceId: { exact: micDeviceId } } : true
  } else if (constraints.audio === true) {
    audio = micDeviceId !== undefined ? { deviceId: { exact: micDeviceId } } : true
  } else if (constraints.audio === false) {
    audio = false
  } else {
    audio = { ...constraints.audio, deviceId: { exact: micDeviceId } }
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ ...constraints, video, audio })
  } catch (err: any) {
    console.warn('Failed to get camera stream', err)
    return null
  }
}

export async function getMicrophoneStream (
  deviceId: MediaDeviceInfo['deviceId'] | undefined,
  constraints?: MediaStreamConstraints
): Promise<MediaStream | null> {
  if (navigator?.mediaDevices === undefined) {
    console.warn('mediaDevices API not available')
    return null
  }

  let audio: MediaTrackConstraints | boolean

  if (constraints?.audio === undefined) {
    audio = deviceId !== undefined ? { deviceId: { exact: deviceId } } : true
  } else if (constraints.audio === true) {
    audio = deviceId !== undefined ? { deviceId: { exact: deviceId } } : true
  } else if (constraints.audio === false) {
    audio = false
  } else {
    audio = { ...constraints.audio, deviceId: { exact: deviceId } }
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ ...constraints, audio })
  } catch (err: any) {
    console.warn('Failed to get microphone stream', err)
    return null
  }
}

export async function getDisplayMedia (constraints: MediaStreamConstraints): Promise<MediaStream> {
  if (
    navigator?.mediaDevices?.getDisplayMedia !== undefined &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function'
  ) {
    return await navigator.mediaDevices.getDisplayMedia(constraints)
  }

  throw new Error('getDisplayMedia not supported')
}

export function releaseStream (stream: MediaStream | null): void {
  if (stream !== null) {
    stream.getTracks().forEach((track) => {
      track.stop()
    })
  }
}
