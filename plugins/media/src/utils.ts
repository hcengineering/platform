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

/** @public */
export async function requestMediaAccess (kind?: MediaDeviceKind, withAccess?: () => Promise<void>): Promise<boolean> {
  if (navigator?.mediaDevices === undefined) {
    console.warn('mediaDevices API not available')
    return false
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      ...(kind !== 'videoinput' ? { audio: true } : undefined),
      ...(kind !== 'audioinput' && kind !== 'audiooutput' ? { video: true, deviceId: 'default' } : undefined)
    })

    try {
      await withAccess?.()
    } catch (err) {
      console.error(err)
    }

    stream.getTracks().forEach((track) => {
      track.stop()
    })
    return true
  } catch (err) {
    console.warn('Error accessing media devices:', err)
    return false
  }
}

/** @public */
export async function enumerateDevices (kind: MediaDeviceKind, requestPermissions = false): Promise<MediaDeviceInfo[]> {
  if (navigator?.mediaDevices === undefined) {
    console.warn('mediaDevices API not available')
    return []
  }

  let devices = await navigator.mediaDevices.enumerateDevices()
  if (requestPermissions) {
    const noDevices = devices.filter((d) => d.kind === kind).length === 0
    const noLabel = devices.some((d) => d.kind === kind && d.label === '')
    if (noDevices || noLabel) {
      const granted = await requestMediaAccess(kind, async () => {
        devices = await navigator.mediaDevices.enumerateDevices()
      })
      if (!granted) {
        devices = []
      }
    }
  }

  return devices.filter((d) => d.kind === kind)
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
