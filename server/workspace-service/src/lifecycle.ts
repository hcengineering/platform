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

import type { MeasureContext } from '@hcengineering/core'
import { setTimeout as delay } from 'timers/promises'

/** Stop startup retries promptly, including when the current handshake never settles. */
export async function runWorkspaceHandshake (
  ctx: MeasureContext,
  handshake: () => Promise<void>,
  signal: AbortSignal
): Promise<boolean> {
  while (!signal.aborted) {
    let onAbort: () => void = () => {}
    try {
      const canceled = new Promise<boolean>((resolve) => {
        onAbort = () => {
          resolve(false)
        }
        signal.addEventListener('abort', onAbort, { once: true })
      })
      // The race handles late rejection too; cancellation must not start another attempt.
      if (await Promise.race([handshake().then(() => true), canceled])) return true
      return false
    } catch (error) {
      if (signal.aborted) return false
      ctx.error('error during handshake', { error })
    } finally {
      signal.removeEventListener('abort', onAbort)
    }
    try {
      await delay(1000, undefined, { signal })
    } catch (error) {
      if (!signal.aborted) throw error
    }
  }
  return false
}

/** Bound graceful draining so an unavailable dependency cannot prevent resource cleanup. */
export async function waitForWorkspaceWorker (
  ctx: MeasureContext,
  worker: Promise<void>,
  timeoutMs: number = 30000
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const drained = await Promise.race([
      worker.then(() => true),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => {
          resolve(false)
        }, timeoutMs)
      })
    ])
    if (!drained) ctx.warn('Workspace worker shutdown timed out; closing queue', { timeoutMs })
  } finally {
    clearTimeout(timer)
  }
}
