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
  getMediaDevices,
  cleanupDeviceLabel
} from '@hcengineering/media'
import { type IntlString, getEmbeddedLabel } from '@hcengineering/platform'
import EventEmitter from 'events'
import { onDestroy } from 'svelte'
import type TypedEventEmitter from 'typed-emitter'
import { registerSession, sessions, state, unregisterSession } from './stores'
import { get } from 'svelte/store'

/** @public */
export function getDeviceLabel (device: MediaDeviceInfo): IntlString {
  return getEmbeddedLabel(cleanupDeviceLabel(device.label))
}

/** @public */
export function toggleCamState (): void {
  toggleDeviceState('camera')
}

/** @public */
export function toggleMicState (): void {
  toggleDeviceState('microphone')
}

export interface UseMediaOptions {
  state: MediaState
  autoDestroy?: boolean
}

export async function useMedia (options: UseMediaOptions): Promise<MediaSession> {
  const session = new MediaSessionImpl(options.state)
  const autoDestroy = options.autoDestroy ?? true

  const mediaDevices = await getMediaDevices(
    options.state?.microphone?.enabled === true,
    options.state?.camera?.enabled === true
  )

  session.setCamera({
    enabled: session.state.camera?.enabled === true && mediaDevices.activeCamera !== undefined,
    deviceId: mediaDevices.activeCamera?.deviceId
  })

  if (session.state.microphone?.enabled === true) {
    session.setMicrophone({
      enabled: mediaDevices.activeMicrophone !== undefined,
      deviceId: mediaDevices.activeMicrophone?.deviceId
    })
  }

  if (autoDestroy) {
    onDestroy(() => {
      session.close()
      session.removeAllListeners()
    })
  }

  return session
}

function toggleDeviceState (kind: 'camera' | 'microphone'): void {
  const deviceState: CamState | MicState | undefined = kind === 'camera' ? get(state).camera : get(state).microphone
  const enabled = deviceState?.enabled ?? false
  for (const session of get(sessions)) {
    session.emit(kind, !enabled)
  }
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
