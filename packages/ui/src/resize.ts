// Copyright © 2022 Hardcore Engineering Inc.
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

import { writable } from 'svelte/store'
import { DelayedCaller } from './utils'
import type { SeparatedItem, DefSeparators } from './types'

// limitations under the License.
let observer: ResizeObserver
let callbacks: WeakMap<Element, (element: Element) => any>

const delayedCaller = new DelayedCaller(10)

/**
 * @public
 */
export function resizeObserver (element: Element, onResize: (element: Element) => any): { destroy: () => void } {
  if (observer === undefined) {
    callbacks = new WeakMap()
    const entriesPending = new Set<Element>()

    const notifyObservers = (): void => {
      window.requestAnimationFrame(() => {
        for (const target of entriesPending.values()) {
          const onResize = callbacks.get(target)
          if (onResize != null) {
            onResize(target)
          }
        }
        entriesPending.clear()
      })
    }

    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        entriesPending.add(entry.target)
      }
      delayedCaller.call(notifyObservers)
    })
  }

  callbacks.set(element, onResize)
  observer.observe(element)

  return {
    destroy: () => {
      callbacks.delete(element)
      observer.unobserve(element)
    }
  }
}

/**
 * @public
 */
export const separatorsKeyId = 'separators'

export const nullSeparatedItem: SeparatedItem = {
  size: 'auto',
  minSize: 20,
  maxSize: 'auto',
  float: undefined
}

const compareSeparators = (a: SeparatedItem[], b: SeparatedItem[]): boolean => {
  if (a.length !== b.length) return false
  return a.every(
    (sep, index) => sep.minSize === b[index].minSize && sep.maxSize === b[index].maxSize && sep.float === b[index].float
  )
}

const generateSeparatorsId = (name: string): string => {
  return separatorsKeyId + '_' + name
}

export function defineSeparators (name: string, items: DefSeparators): void {
  const id = generateSeparatorsId(name)
  const income = items.map((it) => (it === null ? nullSeparatedItem : it))
  const saved = localStorage.getItem(id)
  let needAdd = false
  if (saved !== null) {
    const loaded: SeparatedItem[] = JSON.parse(saved)
    if (!compareSeparators(loaded, income)) {
      localStorage.removeItem(id)
      needAdd = true
    }
  } else needAdd = true
  if (needAdd) localStorage.setItem(id, JSON.stringify(income))
}

export function getSeparators (name: string): SeparatedItem[] | null {
  const id = generateSeparatorsId(name)
  const saved = localStorage.getItem(id)
  return saved !== null ? JSON.parse(saved) : null
}

export function saveSeparator (name: string, separators: SeparatedItem[]): void {
  const id = generateSeparatorsId(name)
  localStorage.setItem(id, JSON.stringify(separators))
}

export const panelSeparators: DefSeparators = [
  { minSize: 30, size: 'auto', maxSize: 'auto' },
  { minSize: 17, size: 25, maxSize: 50, float: 'aside' }
]

export const workbenchSeparators: DefSeparators = [
  { minSize: 12, size: 17.5, maxSize: 22, float: 'navigator' },
  null,
  { minSize: 20, size: 30, maxSize: 50, float: 'aside' }
]

export const timeSeparators: DefSeparators = [
  { minSize: 10, size: 17.5, maxSize: 22, float: 'navigator' },
  { minSize: 25, size: 35, maxSize: 45 },
  null
]

export const separatorsStore = writable<string[]>([])
