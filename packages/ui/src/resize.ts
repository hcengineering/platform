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
