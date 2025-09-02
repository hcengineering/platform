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

// Enhanced TypeScript mock for svelte/store inspired by Svelte Testing Library patterns
// This provides more accurate Jest-compatible implementations of Svelte stores

export type Subscriber<T> = (value: T) => void
export type Unsubscriber = () => void
export type Updater<T> = (value: T) => T
export type StartStopNotifier<T> = (set: (value: T) => void) => Unsubscriber | undefined

export interface Readable<T> {
  subscribe: (run: Subscriber<T>, invalidate?: any) => Unsubscriber
  _getValue?: () => T
}

export interface Writable<T> extends Readable<T> {
  set: (value: T) => void
  update: (updater: Updater<T>) => void
  _getSubscriberCount?: () => number
}

export interface Derived<T> extends Readable<T> {
  _getValue?: () => T
}

export const writable = <T>(initialValue: T): Writable<T> => {
  let value = initialValue
  const subscribers = new Set<Subscriber<T>>()

  const store: Writable<T> = {
    subscribe: (callback: Subscriber<T>) => {
      subscribers.add(callback)
      callback(value)
      return () => subscribers.delete(callback)
    },
    set: (newValue: T) => {
      value = newValue
      subscribers.forEach((callback) => {
        callback(value)
      })
    },
    update: (updater: Updater<T>) => {
      value = updater(value)
      subscribers.forEach((callback) => {
        callback(value)
      })
    },
    _getValue: () => value,
    _getSubscriberCount: () => subscribers.size
  }

  return store
}

export const derived = <T>(
  stores: Readable<any> | Array<Readable<any>>,
  fn: (values: any) => T,
  initialValue?: T
): Derived<T> => {
  const storeArray = Array.isArray(stores) ? stores : [stores]

  let computedValue: T
  try {
    // provide reasonable defaults for testing
    const values = storeArray.map((store) => {
      if (store != null && typeof store.subscribe === 'function') {
        return store._getValue != null ? store._getValue() : []
      }
      return []
    })

    computedValue = Array.isArray(stores) ? fn(values) : fn(values[0])
  } catch (e) {
    computedValue = initialValue ?? ([] as any)
  }

  const store: Derived<T> = {
    subscribe: (callback: Subscriber<T>) => {
      callback(computedValue)
      return () => {}
    },
    _getValue: () => computedValue
  }

  return store
}

export const readable = <T>(initialValue: T, startStopNotifier?: StartStopNotifier<T>): Readable<T> => {
  const store: Readable<T> = {
    subscribe: (callback: Subscriber<T>) => {
      callback(initialValue)

      if (typeof startStopNotifier === 'function') {
        const stop = startStopNotifier((newValue: T) => {
          callback(newValue)
        })

        return () => {
          if (typeof stop === 'function') {
            stop()
          }
        }
      }

      return () => {}
    },
    _getValue: () => initialValue
  }

  return store
}

export const get = <T>(store: Readable<T>): T => {
  if (store?._getValue != null) {
    return store._getValue()
  }

  let value: T | undefined
  const unsubscribe = store.subscribe((v: T) => {
    value = v
  })
  unsubscribe()
  return value as T
}
