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

import { type Readable, get, writable } from 'svelte/store'

import { type RecordingOptions, type RecordingState } from '../types'
import { createScreenRecorder } from '../screen-recorder'

export const recording = createRecordingStore()

export interface RecordingMethods {
  start: (options: RecordingOptions) => Promise<void>
  stop: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  cancel: () => Promise<void>
  clear: () => void
}

function createRecordingStore (): Readable<RecordingState | null> & RecordingMethods {
  const $state = writable<RecordingState | null>(null)

  return {
    subscribe: $state.subscribe,

    async start (options: RecordingOptions) {
      const current = get($state)
      if (current !== null) {
        throw new Error('Recording already started')
      }

      const recorder = await createScreenRecorder(options)
      await recorder.start()

      $state.set({
        recorder,
        options,
        stream: options.stream,
        state: 'recording',
        result: null
      })
    },

    async stop () {
      const current = get($state)
      if (current !== null && current.state === 'recording') {
        $state.update((state) => (state != null ? { ...state, state: 'stopping' } : null))

        const result = await current.recorder.stop()
        await current.options.onSuccess?.(result)

        $state.update((state) => (state != null ? { ...state, state: 'stopped', result } : null))
      } else {
        console.warn('Recording is not in `recording` state', current)
      }
    },

    async pause () {
      const current = get($state)
      if (current !== null && current.state === 'recording') {
        await current.recorder.pause()
        $state.update((state) => (state != null ? { ...state, state: 'paused' } : null))
      } else {
        console.warn('Recording is not in `recording` state', current)
      }
    },

    async resume () {
      const current = get($state)
      if (current !== null && current.state === 'paused') {
        await current.recorder.resume()
        $state.update((state) => (state != null ? { ...state, state: 'recording' } : null))
      } else {
        console.warn('Recording is not in `paused` state', current)
      }
    },

    async cancel () {
      const current = get($state)
      if (current !== null) {
        await current.recorder.cancel()
        $state.set(null)
      }
    },

    clear () {
      $state.set(null)
    }
  }
}
