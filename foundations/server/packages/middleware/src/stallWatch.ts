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

import { Analytics } from '@hcengineering/analytics'

/**
 * Diagnostics for pipeline requests that wait too long on a shared promise (cache load, init, per-document
 * ordering, broadcast target resolution).
 *
 * If the promise is still pending after `PIPELINE_STALL_THRESHOLD_MS` (default 1000), a stall is reported through
 * `Analytics.handleError`; when it settles later, `pipeline-stall-resolved` carries the wait time and `failed`, so
 * "slow" can be told from "never finishes". Reports are rate limited per label and workspace.
 * Set `PIPELINE_STALL_WATCH=false` to turn it off.
 */

const isEnabled = (): boolean => process.env.PIPELINE_STALL_WATCH !== 'false'
const parsedThreshold = parseInt(process.env.PIPELINE_STALL_THRESHOLD_MS ?? '1000', 10)
const THRESHOLD_MS = Number.isFinite(parsedThreshold) && parsedThreshold > 0 ? parsedThreshold : 1000

const RATE_WINDOW_MS = 10_000
const MAX_REPORTS_PER_WINDOW = 20
const MAX_WINDOWS = 1000

interface RateWindow {
  start: number
  reported: number
  suppressed: number
}

const windows = new Map<string, RateWindow>()

/** Stable message (good for grouping); per-incident details are in `attributes`. */
export class PipelineStallError extends Error {
  constructor (
    label: string,
    readonly attributes: Record<string, string>
  ) {
    super(`pipeline-stall: ${label} pending > ${THRESHOLD_MS}ms`)
    this.name = 'PipelineStallError'
  }
}

/** @returns reports suppressed since the previous allowed one, or undefined if this report is not allowed */
function acquire (key: string, now: number): number | undefined {
  if (windows.size >= MAX_WINDOWS) {
    for (const [k, w] of windows) {
      if (now - w.start >= RATE_WINDOW_MS) windows.delete(k)
    }
    if (windows.size >= MAX_WINDOWS) {
      const oldestKey = windows.keys().next().value
      if (oldestKey !== undefined) windows.delete(oldestKey)
    }
  }
  const win = windows.get(key)
  if (win === undefined || now - win.start >= RATE_WINDOW_MS) {
    windows.set(key, { start: now, reported: 1, suppressed: 0 })
    return win?.suppressed ?? 0
  }
  if (win.reported >= MAX_REPORTS_PER_WINDOW) {
    win.suppressed++
    return undefined
  }
  win.reported++
  return 0
}

function safeAttrs (attrs: () => Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  try {
    for (const [k, v] of Object.entries(attrs())) {
      result[k] = typeof v === 'string' ? v : String(JSON.stringify(v))
    }
  } catch (err: any) {
    result.attrsError = String(err?.message ?? err)
  }
  return result
}

/**
 * Awaits `promise`, reporting if it takes longer than the threshold.
 * Never changes the result or the rejection of `promise`.
 */
export async function watchStall<T> (
  label: string,
  attrs: () => Record<string, unknown>,
  promise: Promise<T>
): Promise<T> {
  if (!isEnabled()) {
    return await promise
  }
  const started = Date.now()
  let reported: Record<string, string> | undefined
  let failed = false
  const timer = setTimeout(() => {
    try {
      const details = safeAttrs(attrs)
      const suppressed = acquire(`${label}:${details.workspace ?? ''}`, Date.now())
      if (suppressed === undefined) return
      reported = details
      Analytics.handleError(new PipelineStallError(label, { ...details, label, suppressedBefore: String(suppressed) }))
    } catch {
      // diagnostics must never affect the request
    }
  }, THRESHOLD_MS)
  timer.unref?.()
  try {
    return await promise
  } catch (err: any) {
    failed = true
    throw err
  } finally {
    clearTimeout(timer)
    if (reported !== undefined) {
      try {
        Analytics.handleEvent('pipeline-stall-resolved', {
          ...reported,
          label,
          elapsedMs: String(Date.now() - started),
          failed: String(failed)
        })
      } catch {
        // ignore
      }
    }
  }
}

/** @internal for tests */
export function _resetStallWatchForTests (): void {
  windows.clear()
}
