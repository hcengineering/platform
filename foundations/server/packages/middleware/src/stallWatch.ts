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
 * Diagnostics for pipeline requests that wait on a shared promise (cache load, init, per-document ordering,
 * broadcast target resolution) for too long.
 *
 * When the awaited promise is still pending after `PIPELINE_STALL_THRESHOLD_MS` (default 1000), a stall is
 * reported once through Analytics (`handleError`). If the promise settles later, the wait time is reported with
 * the `pipeline-stall-resolved` event (with `failed=true` if it rejected), so "slow" can be told from "never finishes".
 *
 * Reports are rate limited per label so a stall storm cannot flood the telemetry pipeline.
 * Set `PIPELINE_STALL_WATCH=false` to turn it off.
 */

// Read lazily so the switch can be flipped without reloading the module (and tested)
const isEnabled = (): boolean => process.env.PIPELINE_STALL_WATCH !== 'false'
const parsedThreshold = parseInt(process.env.PIPELINE_STALL_THRESHOLD_MS ?? '1000', 10)
const THRESHOLD_MS = Number.isFinite(parsedThreshold) && parsedThreshold > 0 ? parsedThreshold : 1000

const RATE_WINDOW_MS = 10_000
const MAX_REPORTS_PER_WINDOW = 20

interface RateWindow {
  start: number
  reported: number
  suppressed: number
}

const MAX_WINDOWS = 1000

const windows = new Map<string, RateWindow>()

/**
 * Error with a stable message (good for grouping) and the per-incident details in `attributes`.
 */
export class PipelineStallError extends Error {
  constructor (
    readonly label: string,
    thresholdMs: number,
    readonly attributes: Record<string, string>
  ) {
    super(`pipeline-stall: ${label} pending > ${thresholdMs}ms`)
    this.name = 'PipelineStallError'
  }
}

/**
 * @param key rate limit key (label + workspace), so one noisy workspace cannot hide stalls in others
 * @returns number of reports suppressed since the previous allowed one, or undefined if this report is not allowed
 */
function acquire (key: string, now: number): number | undefined {
  if (windows.size >= MAX_WINDOWS) {
    for (const [k, w] of windows) {
      if (now - w.start >= RATE_WINDOW_MS && w.suppressed === 0) windows.delete(k)
    }
  }
  const label = key
  let win = windows.get(label)
  if (win === undefined || now - win.start >= RATE_WINDOW_MS) {
    const suppressed = win?.suppressed ?? 0
    win = { start: now, reported: 0, suppressed: 0 }
    windows.set(label, win)
    win.reported++
    return suppressed
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
  let reported = false
  let failed = false
  const timer = setTimeout(() => {
    try {
      const details = safeAttrs(attrs)
      const suppressed = acquire(`${label}:${details.workspace ?? ''}`, Date.now())
      if (suppressed === undefined) return
      reported = true
      Analytics.handleError(
        new PipelineStallError(label, THRESHOLD_MS, {
          ...details,
          label,
          thresholdMs: String(THRESHOLD_MS),
          suppressedBefore: String(suppressed)
        })
      )
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
    if (reported) {
      try {
        Analytics.handleEvent('pipeline-stall-resolved', {
          label,
          elapsedMs: String(Date.now() - started),
          failed: String(failed),
          ...safeAttrs(attrs)
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
