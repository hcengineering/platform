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
import type { DefSeparators, SeparatedItem } from './types'
import { DelayedCaller } from './utils'

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

/**
 * @public
 */
export enum SeparatorState {
  FLOAT = 'float',
  HIDDEN = 'hidden',
  NORMAL = 'normal'
}

export const nullSeparatedItem: SeparatedItem = {
  size: 'auto',
  minSize: 20,
  maxSize: 'auto',
  float: undefined
}

const compareSeparators = (a: SeparatedItem[] | SeparatedItem, b: SeparatedItem[] | SeparatedItem): boolean => {
  if (!Array.isArray(a) && !Array.isArray(b)) {
    return a.minSize === b.minSize && a.maxSize === b.maxSize && a.float === b.float
  }
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  return a.every(
    (sep, index) => sep.minSize === b[index].minSize && sep.maxSize === b[index].maxSize && sep.float === b[index].float
  )
}

const generateSeparatorsId = (name: string, float: string | boolean): string => {
  return separatorsKeyId + '_' + name + (typeof float === 'string' ? '-float-' + float : '')
}

export function defineSeparators (name: string, items: DefSeparators): void {
  const id = generateSeparatorsId(name, false)
  const income = items.map((it) => it ?? nullSeparatedItem)
  let needAdd = true
  const saved = localStorage.getItem(id)
  if (typeof saved === 'string') {
    if (saved === 'undefined') localStorage.removeItem(id)
    else {
      const loaded: SeparatedItem[] = JSON.parse(saved)
      if (!compareSeparators(loaded, income)) localStorage.removeItem(id)
      else needAdd = false
    }
  }
  if (needAdd) localStorage.setItem(id, JSON.stringify(income))
  items.forEach((it) => {
    if (typeof it?.float === 'string') {
      const idF = generateSeparatorsId(name, it.float)
      let needAdd = true
      const savedF = localStorage.getItem(idF)
      if (typeof savedF === 'string') {
        if (savedF === 'undefined') localStorage.removeItem(idF)
        else {
          const loadedF: SeparatedItem = JSON.parse(savedF)
          if (!compareSeparators(loadedF, it)) localStorage.removeItem(idF)
          else needAdd = false
        }
      }
      if (needAdd) localStorage.setItem(idF, JSON.stringify(it))
    }
  })
}

export function getSeparators (name: string, float: string | boolean): SeparatedItem[] | SeparatedItem | null {
  const id = generateSeparatorsId(name, float)
  const saved = localStorage.getItem(id)
  if (saved === null) return null
  const result = JSON.parse(saved)
  return Array.isArray(result) ? (result as SeparatedItem[]) : (result as SeparatedItem)
}

export function saveSeparator (
  name: string,
  float: string | boolean,
  separators: SeparatedItem | SeparatedItem[]
): void {
  const id = generateSeparatorsId(name, float)
  localStorage.setItem(
    id,
    Array.isArray(separators) && typeof float === 'string' ? JSON.stringify(separators[0]) : JSON.stringify(separators)
  )
}

export const panelSeparators: DefSeparators = [
  { minSize: 30, size: 'auto', maxSize: 'auto' },
  { minSize: 17, size: 25, maxSize: 35, float: 'aside' }
]

export const workbenchSeparators: DefSeparators = [
  { minSize: 12.5, size: 17.5, maxSize: 22.5, float: 'navigator' },
  null,
  { minSize: 20, size: 30, maxSize: 50, float: 'aside' }
]

export const settingsSeparators: DefSeparators = [
  { minSize: 12.5, size: 17.5, maxSize: 22.5, float: 'navigator' },
  null,
  { minSize: 19, size: 30, maxSize: 32, float: 'aside' }
]

export const secondNavSeparators: DefSeparators = [{ minSize: 7, size: 7.5, maxSize: 15, float: 'navigator' }, null]

export const separatorsStore = writable<string[]>([])
