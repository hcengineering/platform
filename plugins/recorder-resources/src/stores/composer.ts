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

import { type Readable, derived, get, writable } from 'svelte/store'
import { type StreamComposer, type StreamComposerConfig, createCanvasStreamComposer } from '../composer'
import { DefaultFps } from '../const'
import { getRecordingCameraPosition, getRecordingCameraSize } from '../utils'

export interface ComposerState {
  composer: StreamComposer | null
  canvasWidth: number
  canvasHeight: number
  canvasStream: MediaStream | null
}

export interface ComposerStore extends Readable<ComposerState> {
  initialize: () => void
  updateConfig: (config: Partial<StreamComposerConfig>) => void
  updateCameraStream: (stream: MediaStream | null) => void
  updateScreenStream: (stream: MediaStream | null) => void
  getStream: () => MediaStream | null
  cleanup: (force?: boolean) => void
}

export const composer = createComposerStore()

function createComposerStore (): ComposerStore {
  const state = writable<ComposerState>({
    composer: null,
    canvasWidth: 1280,
    canvasHeight: 720,
    canvasStream: null
  })

  return {
    subscribe: state.subscribe,

    initialize (): void {
      const current = get(state)

      if (current.composer === null) {
        try {
          const composer = createCanvasStreamComposer({
            fps: DefaultFps,
            cameraSize: getRecordingCameraSize(),
            cameraPos: getRecordingCameraPosition(),
            onCanvasSizeChange: ({ width, height }) => {
              state.update((s) => ({ ...s, canvasWidth: width, canvasHeight: height }))
            }
          })
          const canvasStream = composer.getStream()
          state.update((s) => ({ ...s, composer, canvasStream }))
        } catch (error) {
          console.error('Failed to initialize stream composer:', error)
          throw error
        }
      }
    },

    updateConfig (config: Partial<StreamComposerConfig>): void {
      const currentState = get(state)
      currentState.composer?.updateConfig(config)
    },

    updateCameraStream (stream: MediaStream | null): void {
      const currentState = get(state)
      if (currentState.composer !== null) {
        currentState.composer.updateCameraStream(stream)
      }
    },

    updateScreenStream (stream: MediaStream | null): void {
      const currentState = get(state)
      if (currentState.composer !== null) {
        currentState.composer.updateScreenStream(stream)
      }
    },

    getStream (): MediaStream | null {
      const currentState = get(state)
      return currentState.composer?.getStream() ?? null
    },

    cleanup (): void {
      const { composer } = get(state)
      if (composer !== null) {
        composer.destroy()
        state.update((state) => ({
          ...state,
          composer: null,
          canvasStream: null
        }))
      }
    }
  }
}

export const canvasWidth = derived(composer, ($state) => $state.canvasWidth)
export const canvasHeight = derived(composer, ($state) => $state.canvasHeight)
export const canvasStream = derived(composer, ($state) => $state.canvasStream)
