//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Debounce handle for the critical-path / slack recompute.
 *
 * The forward/backward pass behind `computeCriticalPath` is triggered by a
 * reactive statement that fires on every issue, relation and view-option
 * change — dozens of times per second while a bar is being dragged. The
 * recompute is therefore debounced: only the last change in a burst runs.
 *
 * The handle lives in its own object rather than as a bare `setTimeout` id in
 * the component because a pending timer has to be *cancelled*, not just
 * ignored, in two situations:
 *
 *  - both consumers (critical-path overlay and slack column) get switched off
 *    while a recompute is already queued. Leaving the timer armed would let it
 *    fire afterwards, repopulate the result the toggle just cleared, and even
 *    raise the "dependency cycle" warning for a view that shows neither;
 *  - the view unmounts, where a late callback would write to torn-down state.
 *
 * `cancel()` is idempotent and safe to call when nothing is pending.
 */
export class DebouncedRecompute {
  private handle: ReturnType<typeof setTimeout> | null = null

  constructor (private readonly delayMs: number) {}

  /** Replace any pending run with a new one `delayMs` from now. */
  schedule (run: () => void): void {
    this.cancel()
    this.handle = setTimeout(() => {
      this.handle = null
      run()
    }, this.delayMs)
  }

  /** Drop a pending run, if any. Idempotent. */
  cancel (): void {
    if (this.handle !== null) {
      clearTimeout(this.handle)
      this.handle = null
    }
  }

  /** True while a run is queued. */
  get pending (): boolean {
    return this.handle !== null
  }
}
