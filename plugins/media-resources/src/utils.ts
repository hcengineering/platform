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

import {
  type CamState,
  type MicState,
  type MediaState,
  type MediaSession,
  type MediaSessionEvents,
  getSelectedCamId,
  getSelectedMicId,
  getSelectedSpeakerId,
  enumerateDevices,
  cleanupDeviceLabel
} from '@hcengineering/media'
import { type IntlString, getEmbeddedLabel } from '@hcengineering/platform'
import EventEmitter from 'events'
import { onDestroy } from 'svelte'
import type TypedEventEmitter from 'typed-emitter'
import { registerSession, unregisterSession } from './stores'

/** @public */
export async function getSelectedMic (): Promise<MediaDeviceInfo | undefined> {
  const deviceId = getSelectedMicId()

  const devices = await enumerateDevices('audioinput')
  return deviceId !== undefined ? devices.find((it) => it.deviceId === deviceId) : devices[0]
}

/** @public */
export async function getSelectedCam (): Promise<MediaDeviceInfo | null | undefined> {
  const deviceId = getSelectedCamId()

  const devices = await enumerateDevices('videoinput')
  return deviceId !== undefined ? devices.find((it) => it.deviceId === deviceId) ?? null : devices[0] ?? undefined // default
}

/** @public */
export async function getSelectedSpeaker (): Promise<MediaDeviceInfo | undefined> {
  const deviceId = getSelectedSpeakerId()

  const devices = await enumerateDevices('audiooutput')
  return deviceId !== undefined ? devices.find((it) => it.deviceId === deviceId) : devices[0]
}

/** @public */
export async function checkMediaAccess (kind: MediaDeviceKind): Promise<PermissionStatus['state']> {
  const name = (kind === 'audioinput' ? 'microphone' : 'camera') as PermissionName
  const status = await navigator.permissions.query({ name })
  return status.state
}

/** @public */
export function getDeviceLabel (device: MediaDeviceInfo): IntlString {
  return getEmbeddedLabel(cleanupDeviceLabel(device.label))
}

export interface UseMediaOptions {
  state: MediaState
  autoDestroy?: boolean
}

export function useMedia (options: UseMediaOptions): MediaSession {
  const session = new MediaSessionImpl(options.state)
  const autoDestroy = options.autoDestroy ?? true

  if (autoDestroy) {
    onDestroy(() => {
      session.close()
      session.removeAllListeners()
    })
  }

  return session
}

class MediaSessionImpl
  extends (EventEmitter as unknown as new () => TypedEventEmitter<MediaSessionEvents>)
  implements MediaSession {
  readonly state: MediaState

  constructor (state: MediaState) {
    // eslint-disable-next-line constructor-super
    super()
    this.state = { ...state }

    registerSession(this)
  }

  setCamera (state: CamState | undefined): void {
    this.state.camera = state
    this.emit('update', this.state)
  }

  setMicrophone (state: MicState | undefined): void {
    this.state.microphone = state
    this.emit('update', this.state)
  }

  setFeature (feature: string, state: any): void {
    this.state[feature] = state
    this.emit('update', this.state)
  }

  close (): void {
    unregisterSession(this)
  }
}
