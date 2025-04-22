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

import type { MediaSession, MediaState } from '@hcengineering/media'
import { type Readable, derived, readable, writable } from 'svelte/store'

export interface PermissionStore {
  state: PermissionStatus['state']
  ready: Promise<void>
}

export const sessions = writable<MediaSession[]>([])
export const state: Readable<MediaState> = derived(sessions, ($sessions) => {
  const camera = $sessions.some((s) => s.state.camera !== undefined)
    ? $sessions.length > 0
      ? { enabled: $sessions.some((s) => s.state.camera?.enabled) }
      : undefined
    : undefined
  const microphone = $sessions.some((s) => s.state.microphone !== undefined)
    ? $sessions.length > 0
      ? { enabled: $sessions.some((s) => s.state.microphone?.enabled) }
      : undefined
    : undefined
  return { camera, microphone }
})

export const camAccess = createPermissionStore('camera' as PermissionName)
export const micAccess = createPermissionStore('microphone' as PermissionName)

function createPermissionStore (name: PermissionName): Readable<PermissionStore> {
  return readable<PermissionStore>({ state: 'prompt', ready: Promise.resolve() }, (set) => {
    let resolveReady: () => void
    const readyPromise = new Promise<void>((resolve) => {
      resolveReady = resolve
    })

    void navigator.permissions
      .query({ name })
      .then((result) => {
        set({ state: result.state, ready: readyPromise })
        resolveReady()
        result.onchange = () => {
          set({ state: result.state, ready: readyPromise })
        }
      })
      .catch((e) => {
        console.warn('Permission API error', e)
        resolveReady()
      })

    set({ state: 'prompt', ready: readyPromise })
  })
}

export function registerSession (session: MediaSession): void {
  session.on('update', handleSessionUpdate)
  sessions.update((sessions) => (sessions.includes(session) ? sessions : [...sessions, session]))
}

export function unregisterSession (session: MediaSession): void {
  session.off('update', handleSessionUpdate)
  sessions.update((sessions) => sessions.filter((it) => it !== session))
}

function handleSessionUpdate (state: MediaState): void {
  sessions.update((sessions) => sessions)
}
