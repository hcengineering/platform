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

// TypeScript mock for svelte

export type MountCallback = () => undefined | (() => void)
export type DestroyCallback = () => void
export type EventDispatcher<T extends Record<string, any> = any> = <K extends keyof T>(
  type: K,
  detail?: T[K]
) => boolean

export const onMount = (fn: MountCallback): undefined | (() => void) => {
  if (typeof fn === 'function') {
    return fn()
  }
}

export const onDestroy = (fn: DestroyCallback): DestroyCallback => {
  return fn
}

export const tick = async (): Promise<void> => {
  await Promise.resolve()
}

export const createEventDispatcher = <T extends Record<string, any> = any>(): EventDispatcher<T> => {
  return <K extends keyof T>(eventType: K, detail?: T[K]): boolean => {
    return true
  }
}
