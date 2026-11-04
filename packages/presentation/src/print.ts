//
// Copyright © 2026 TraceX SAS.
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

import { getContext, setContext } from 'svelte'
import { writable, type Readable } from 'svelte/store'
import type { RenderContext } from '@hcengineering/ui'

const PRINT_CONTEXT = Symbol('print-context')

/** Rendering state owned by one isolated print application. @public */
export interface PrintContext extends RenderContext {
  readonly pendingResources: Readable<number>
  readonly waitFor: <T>(promise: Promise<T>, timeoutMs?: number) => Promise<T>
  readonly error: Readable<Error | undefined>
}

/** Initialize the print context during PrintApp component initialization. @public */
export function providePrintContext (): PrintContext {
  const pendingResources = writable(0)
  const resources = new Set<symbol>()
  const error = writable<Error | undefined>(undefined)
  const context: PrintContext = {
    pendingResources,
    error,
    fail: (cause) => {
      error.set(cause instanceof Error ? cause : new Error(String(cause)))
    },
    registerResource: (options) => {
      const resource = Symbol('print-resource')
      let timer: ReturnType<typeof setTimeout> | undefined
      resources.add(resource)
      pendingResources.set(resources.size)
      const finish = (): void => {
        clearTimeout(timer)
        resources.delete(resource)
        pendingResources.set(resources.size)
      }
      if (options?.timeoutMs !== undefined) {
        timer = setTimeout(() => {
          try {
            if (options.onTimeout !== undefined) options.onTimeout()
            else context.fail(new Error('Rendering timed out'))
          } finally {
            finish()
          }
        }, options.timeoutMs)
      }
      return finish
    },
    waitFor: async <T>(promise: Promise<T>, timeoutMs?: number): Promise<T> => {
      let rejectTimeout: ((error: Error) => void) | undefined
      const timeout = new Promise<never>((_resolve, reject) => {
        rejectTimeout = reject
      })
      const finish = context.registerResource({
        timeoutMs,
        onTimeout: () => {
          rejectTimeout?.(new Error('Rendering timed out'))
        }
      })
      try {
        return await (timeoutMs === undefined ? promise : Promise.race([promise, timeout]))
      } finally {
        finish()
      }
    }
  }
  return setContext(PRINT_CONTEXT, context)
}

/** Read the rendering context during child component initialization. @public */
export function getPrintContext (): PrintContext | undefined {
  return getContext(PRINT_CONTEXT)
}
